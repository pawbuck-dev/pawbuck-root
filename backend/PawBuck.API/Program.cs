using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PawBuck.API.Security;
using PawBuck.API.Configuration;
using PawBuck.API.Models;
using PawBuck.API.Scheduling;
using PawBuck.API.Scheduling.Abstractions;
using PawBuck.API.Scheduling.Vendors.EazyVet;
using PawBuck.API.Scheduling.Vendors.PawBuckDemo;
using PawBuck.API.Scheduling.Vendors.Vetstoria;
using PawBuck.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Gemini config: Gemini:ApiKey or env GOOGLE_GEMINI_API_KEY
builder.Services.Configure<GeminiOptions>(options =>
{
    builder.Configuration.GetSection(GeminiOptions.SectionName).Bind(options);
    if (string.IsNullOrWhiteSpace(options.ApiKey))
        options.ApiKey = Environment.GetEnvironmentVariable("GOOGLE_GEMINI_API_KEY");
});

// HttpClient for downloading document images (no retry)
builder.Services.AddHttpClient("DocumentImageDownload");

// HttpClient for Gemini API with retry on throttling (429) and transient errors
builder.Services.AddHttpClient("Gemini")
    .AddStandardResilienceHandler();

// Document classification
builder.Services.AddSingleton<IMiloPromptProvider, MiloPromptProvider>();
builder.Services.AddScoped<IDocumentClassifier, GeminiClassifier>();
builder.Services.AddScoped<ClassificationService>();

// Supabase: REST client (Url + anon key, same as Expo) + optional Postgres via Npgsql (see SupabaseOptions).
builder.Services.Configure<SupabaseOptions>(builder.Configuration.GetSection(SupabaseOptions.SectionName));
builder.Services.PostConfigure<SupabaseOptions>(o =>
{
    if (string.IsNullOrWhiteSpace(o.JwtSecret))
        o.JwtSecret = Environment.GetEnvironmentVariable("SUPABASE_JWT_SECRET");
});

var supabaseJwtSecret = builder.Configuration["Supabase:JwtSecret"] ?? Environment.GetEnvironmentVariable("SUPABASE_JWT_SECRET");
var supabaseUrlForJwt = builder.Configuration["Supabase:Url"];
var jwtAudience = builder.Configuration["Supabase:JwtAudience"] ?? "authenticated";
var jwtIssuer = SupabaseJwtIssuer.FromSupabaseUrl(supabaseUrlForJwt);
if (string.IsNullOrWhiteSpace(supabaseJwtSecret))
{
    // Allows the host to start; tokens will fail signature validation until Supabase:JwtSecret is set.
    supabaseJwtSecret = "dev-placeholder-jwt-secret-minimum-32-characters!";
    if (!builder.Environment.IsDevelopment())
        Console.WriteLine("WARNING: Supabase:JwtSecret not configured; set Supabase:JwtSecret or SUPABASE_JWT_SECRET for Milo chat JWT validation.");
}

builder.Services.Configure<AdminOptions>(builder.Configuration.GetSection(AdminOptions.SectionName));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(supabaseJwtSecret)),
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            ValidateIssuer = jwtIssuer != null,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                if (context.Principal?.Identity is not ClaimsIdentity identity)
                    return Task.CompletedTask;
                if (context.SecurityToken is not JwtSecurityToken jwt)
                    return Task.CompletedTask;
                var opts = context.HttpContext.RequestServices.GetRequiredService<IOptions<AdminOptions>>();
                SupabaseAdminClaimHelper.TryAddPawbuckAdminClaim(identity, jwt, opts.Value);
                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddSingleton<IAuthorizationHandler, AdminSupportAuthorizationHandler>();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthorizationPolicies.AdminSupport, policy =>
        policy.Requirements.Add(new AdminSupportRequirement()));
});

builder.Services.AddHttpClient(SupabaseConnectionStringNormalizer.DohHttpClientName, client =>
{
    client.Timeout = TimeSpan.FromSeconds(8);
});
builder.Services.AddSingleton<IPostConfigureOptions<SupabaseOptions>, SupabaseOptionsPostConfigure>();
builder.Services.AddSingleton<SupabaseClientAccessor>();

// RAG FAQ (Milo)
builder.Services.Configure<MiloOptions>(builder.Configuration.GetSection(MiloOptions.SectionName));
builder.Services.AddScoped<IEmbeddingService, GeminiEmbeddingService>();
builder.Services.AddScoped<IKnowledgeBaseService, KnowledgeBaseService>();
builder.Services.AddScoped<MiloRagService>();
builder.Services.AddScoped<IMiloCuratedSnippetsService, MiloCuratedSnippetsService>();
builder.Services.AddScoped<IMiloPetFactsService, MiloPetFactsService>();
builder.Services.AddScoped<IMiloReasoningService, MiloReasoningService>();

// Scheduling / booking (plug-in Vetstoria, EazyVet; extend for grooming/boarding via BookingServiceType)
builder.Services.Configure<SchedulingRoutingOptions>(builder.Configuration.GetSection(SchedulingRoutingOptions.SectionName));
builder.Services.Configure<VetstoriaOptions>(builder.Configuration.GetSection(VetstoriaOptions.SectionName));
builder.Services.Configure<EazyVetOptions>(builder.Configuration.GetSection(EazyVetOptions.SectionName));
builder.Services.AddSingleton<VetstoriaSchedulingAdapter>();
builder.Services.AddSingleton<EazyVetSchedulingAdapter>();
builder.Services.AddSingleton<PawBuckDemoSchedulingAdapter>();
builder.Services.AddSingleton(sp => new SchedulingAdapterRegistry(new ISchedulingVendorAdapter[]
{
    sp.GetRequiredService<VetstoriaSchedulingAdapter>(),
    sp.GetRequiredService<EazyVetSchedulingAdapter>(),
    sp.GetRequiredService<PawBuckDemoSchedulingAdapter>(),
}));
builder.Services.AddSingleton<ConfigurationClinicSchedulingConfigProvider>();
builder.Services.AddSingleton<SupabaseClinicSchedulingConfigProvider>();
builder.Services.AddSingleton<IClinicSchedulingConfigProvider, CompositeClinicSchedulingConfigProvider>();
builder.Services.AddScoped<SchedulingBookingService>();
builder.Services.AddScoped<ISchedulingBookingService>(sp => sp.GetRequiredService<SchedulingBookingService>());

// When Cors:AllowedOrigins is non-empty, only those origins are allowed (use for AWS admin CloudFront, etc.).
// When empty, local dev defaults apply (Expo + admin Vite).
var corsConfigured = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
var corsOrigins = corsConfigured.Length > 0
    ? corsConfigured
    : new[]
    {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    };

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddScoped<ISupportMetricsService, SupportMetricsService>();
builder.Services.AddScoped<ISupportDirectoryService, SupportDirectoryService>();
builder.Services.AddScoped<ISupportVaccinationAdminService, SupportVaccinationAdminService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Admin SPA (Vite) uses http://localhost:5289 in Development; skip HTTPS redirect locally.
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
