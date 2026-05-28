using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Polly;
using PawBuck.API.Security;
using Microsoft.Extensions.Hosting;
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

// Gemini: Gemini:ApiKey, env GOOGLE_GEMINI_API_KEY, or (dev convenience) Admin:ApiKey if it looks like an AI Studio key (AIza…).
// Production (ECS): inject Gemini__ApiKey from AWS Secrets Manager — see docs/AWS.md.
builder.Services.Configure<GeminiOptions>(options =>
{
    builder.Configuration.GetSection(GeminiOptions.SectionName).Bind(options);
    if (!string.IsNullOrEmpty(options.ApiKey))
        options.ApiKey = options.ApiKey.Trim();
    if (string.IsNullOrWhiteSpace(options.ApiKey))
    {
        var env = Environment.GetEnvironmentVariable("GOOGLE_GEMINI_API_KEY");
        if (!string.IsNullOrEmpty(env))
            options.ApiKey = env.Trim();
    }
    if (!string.IsNullOrEmpty(options.Model))
        options.Model = options.Model.Trim();
    if (string.IsNullOrWhiteSpace(options.Model))
    {
        var envModel = Environment.GetEnvironmentVariable("GEMINI_MODEL");
        if (!string.IsNullOrEmpty(envModel))
            options.Model = envModel.Trim();
    }
});

builder.Services.PostConfigure<GeminiOptions>(options =>
{
    if (!string.IsNullOrWhiteSpace(options.ApiKey))
        return;
    var adminKey = builder.Configuration["Admin:ApiKey"]?.Trim();
    if (!string.IsNullOrEmpty(adminKey) && adminKey.StartsWith("AIza", StringComparison.Ordinal))
        options.ApiKey = adminKey;
});

builder.Services.AddSingleton<IPostConfigureOptions<GeminiOptions>, GeminiModelPostConfigure>();

// HttpClient for downloading document images (no retry)
builder.Services.AddHttpClient("DocumentImageDownload");

// HttpClient for Gemini API with retry on throttling (429) and transient errors
builder.Services.AddHttpClient("Gemini")
    .AddStandardResilienceHandler()
    .Configure((options, serviceProvider) =>
    {
        var logger = serviceProvider.GetRequiredService<ILoggerFactory>()
            .CreateLogger("PawBuck.API.GeminiHttp");

        options.Retry.MaxRetryAttempts = 3;
        options.Retry.Delay = TimeSpan.FromSeconds(5);
        options.Retry.BackoffType = DelayBackoffType.Exponential;
        options.Retry.ShouldRetryAfterHeader = true;
        options.Retry.UseJitter = true;

        // Default AttemptTimeout is 10s — too short for Milo vision classify/extract on multi-sticker PDFs.
        options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(120);
        options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(120);

        options.Retry.OnRetry = args =>
        {
            if (args.Outcome.Result is HttpResponseMessage { StatusCode: HttpStatusCode.TooManyRequests })
                logger.LogInformation(
                    "Gemini Rate Limit hit. Backing off for {Seconds} seconds...",
                    args.RetryDelay.TotalSeconds);
            return default;
        };
    });

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
    if (string.IsNullOrWhiteSpace(o.Url))
    {
        o.Url = Environment.GetEnvironmentVariable("SUPABASE_URL")
                ?? Environment.GetEnvironmentVariable("EXPO_PUBLIC_SUPABASE_URL");
    }
    if (string.IsNullOrWhiteSpace(o.ServiceRoleKey))
    {
        o.ServiceRoleKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY")
                           ?? Environment.GetEnvironmentVariable("EXPO_SUPABASE_SERVICE_ROLE_KEY");
    }
});

var jwtSecretFromConfig = builder.Configuration["Supabase:JwtSecret"] ?? Environment.GetEnvironmentVariable("SUPABASE_JWT_SECRET");
var supabaseJwtSecret = jwtSecretFromConfig;
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
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>()
                    .CreateLogger("PawBuck.API.Auth.JwtBearer");
                logger.LogWarning(context.Exception, "Supabase JWT Bearer authentication failed");
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                if (context.Principal?.Identity is not ClaimsIdentity identity)
                    return Task.CompletedTask;
                var opts = context.HttpContext.RequestServices.GetRequiredService<IOptions<AdminOptions>>();
                // Validated token is often Microsoft.IdentityModel.JsonWebTokens.JsonWebToken (not JwtSecurityToken); re-read Bearer for payload-based admin claim.
                SupabaseAdminClaimHelper.TryAddPawbuckAdminClaim(
                    identity,
                    context.SecurityToken,
                    context.HttpContext.Request,
                    opts.Value);
                var hasAdmin = identity.HasClaim(SupabaseAdminClaimHelper.PawbuckAdminClaimType, SupabaseAdminClaimHelper.PawbuckAdminClaimValue);
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>()
                    .CreateLogger("PawBuck.API.Auth.JwtBearer");
                var path = context.HttpContext.Request.Path.Value ?? "";
                var msg = "JWT validated: sub={Sub}, pawbuck_admin_claim={HasAdmin}";
                var sub = context.Principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                    ?? context.Principal.FindFirst("sub")?.Value
                    ?? "(null)";
                if (path.StartsWith("/api/support", StringComparison.Ordinal))
                    logger.LogInformation(msg + " (support route)", sub, hasAdmin);
                else
                    logger.LogDebug(msg, sub, hasAdmin);
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
builder.Services.AddScoped<IVetBookingOwnershipService, VetBookingOwnershipService>();
builder.Services.AddScoped<IBookingRequestAuthorization, BookingRequestAuthorization>();
builder.Services.AddScoped<IPetConversationalContextService, PetConversationalContextService>();
builder.Services.AddScoped<IMiloJournalConfigProvider, MiloJournalConfigProvider>();
builder.Services.AddScoped<IMiloJournalConfigAdminService, MiloJournalConfigAdminService>();
builder.Services.AddScoped<MiloJournalTurnService>();
builder.Services.AddScoped<IMiloJournalTurnService>(sp => sp.GetRequiredService<MiloJournalTurnService>());
builder.Services.AddScoped<IMiloJournalFeedbackAggregateService>(sp => sp.GetRequiredService<MiloJournalTurnService>());
builder.Services.AddScoped<IMiloVisionService, MiloVisionService>();
builder.Services.AddScoped<IMiloHealthBundleService, MiloHealthBundleService>();
builder.Services.AddSingleton<IJournalTreeCatalog, JournalTreeCatalog>();
builder.Services.AddScoped<IMedicationAdrService, MedicationAdrService>();
builder.Services.AddHttpClient<PawBuck.MedicationAdr.IDailyMedSplClient, PawBuck.MedicationAdr.DailyMedSplClient>(client =>
{
    client.BaseAddress = new Uri("https://dailymed.nlm.nih.gov/dailymed/services/v2/");
    client.Timeout = TimeSpan.FromMinutes(2);
});
builder.Services.AddScoped<PawBuck.MedicationAdr.IMedicationAdrIngestRunner, PawBuck.MedicationAdr.MedicationAdrIngestRunner>();
builder.Services.AddScoped<IMedicationAdrIngestionService, MedicationAdrIngestionService>();
builder.Services.AddScoped<IJournalTreeGeminiHelper, JournalTreeGeminiHelper>();
builder.Services.AddScoped<IJournalTreeInterviewService, JournalTreeInterviewService>();
builder.Services.AddScoped<IMiloReasoningService, MiloReasoningService>();

builder.Services.AddHttpClient(nameof(MailInboxResolveService), client =>
{
    client.Timeout = TimeSpan.FromMinutes(5);
});
builder.Services.AddHttpClient(nameof(MailgunEdgeReprocessService), client =>
{
    client.Timeout = TimeSpan.FromMinutes(5);
});
builder.Services.AddScoped<IMailgunEdgeReprocessService, MailgunEdgeReprocessService>();
builder.Services.AddScoped<IMailInboxResolveService, MailInboxResolveService>();

builder.Services.Configure<DocumentSyncOptions>(builder.Configuration.GetSection(DocumentSyncOptions.SectionName));
builder.Services.Configure<ProactivePetHealthOptions>(builder.Configuration.GetSection(ProactivePetHealthOptions.SectionName));
builder.Services.AddScoped<IPetDocumentClinicalSyncService, PetDocumentClinicalSyncService>();
builder.Services.AddHttpClient("ExpoPush");
builder.Services.AddSingleton<IExpoPushService, ExpoPushService>();
builder.Services.AddHostedService<DocumentSyncWorker>();
builder.Services.AddHostedService<ProactivePetHealthWorker>();

builder.Services.Configure<SubscriptionOptions>(builder.Configuration.GetSection(SubscriptionOptions.SectionName));
builder.Services.AddMemoryCache();
builder.Services.AddScoped<ISubscriptionFeatureGateService, SubscriptionFeatureGateService>();
builder.Services.AddScoped<ICountryEmailDocumentVerificationService, CountryEmailDocumentVerificationService>();
builder.Services.AddScoped<IUserEntitlementService, UserEntitlementService>();

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
builder.Services.AddScoped<ISupportProcessedEmailsService, SupportProcessedEmailsService>();
builder.Services.AddScoped<ISupportDocumentProcessingService, SupportDocumentProcessingService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

var startupLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("PawBuck.API.Startup");
var supabaseHost = string.IsNullOrWhiteSpace(supabaseUrlForJwt)
    ? "(empty — issuer validation may be disabled)"
    : (Uri.TryCreate(supabaseUrlForJwt, UriKind.Absolute, out var u) ? u.Host : supabaseUrlForJwt);
startupLogger.LogInformation(
    "Supabase JWT: urlHost={SupabaseHost}, issuer={Issuer}, audience={Audience}, jwtSecretFromConfig={HasSecret}, adminRoleRequired={AdminRole}, allowAnonymousSupportInDev={AllowAnonDev}",
    supabaseHost,
    jwtIssuer ?? "(null)",
    jwtAudience,
    !string.IsNullOrWhiteSpace(jwtSecretFromConfig),
    builder.Configuration["Admin:RequiredAppMetadataRole"] ?? "admin",
    builder.Configuration.GetValue("Admin:AllowAnonymousSupportInDevelopment", false));

if (!app.Environment.IsDevelopment() &&
    (string.IsNullOrWhiteSpace(jwtSecretFromConfig) || string.IsNullOrWhiteSpace(supabaseUrlForJwt)))
{
    startupLogger.LogWarning(
        "Supabase JWT is not fully configured for this environment: set Supabase__Url and Supabase__JwtSecret or SUPABASE_JWT_SECRET on the host (ECS task env). CI deploy can set both via repository Variable VITE_SUPABASE_URL + secret SUPABASE_JWT_SECRET when using scripts/deploy/ecs-merge-pawbuck-api-env.sh.");
}

if (!app.Environment.IsDevelopment() && corsConfigured.Length == 0)
{
    startupLogger.LogWarning(
        "CORS: Cors:AllowedOrigins is unset — using localhost dev origins only. Browsers loading the admin from CloudFront (or any non-localhost URL) will block fetches until you set Cors__AllowedOrigins__0 on the API host (e.g. GitHub variable ADMIN_DASHBOARD_ORIGIN + API deploy using ecs-merge-pawbuck-api-env.sh).");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Admin SPA (Vite) uses http://localhost:5289 in Development; skip HTTPS redirect locally.
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseCors();
// CorsMiddleware only adds response headers when await next() completes without throwing. Unhandled
// exceptions (e.g. DB not configured) would skip those headers and the browser reports a CORS error
// masking the real 500. Catch here so the outer CORS middleware can still attach Access-Control-Allow-Origin.
app.Use(async (context, next) =>
{
    try
    {
        await next(context);
    }
    catch (Exception ex)
    {
        if (ex is OperationCanceledException)
            throw;
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>()
            .CreateLogger("PawBuck.API.UnhandledException");
        if (context.Response.HasStarted)
        {
            logger.LogError(ex, "Unhandled exception after response started");
            throw;
        }

        logger.LogError(ex, "Unhandled exception");

        var status = StatusCodes.Status500InternalServerError;
        string message;
        if (ex is InvalidOperationException ioe)
        {
            message = ioe.Message;
            var m = ioe.Message;
            if (m.Contains("Database", StringComparison.OrdinalIgnoreCase) ||
                m.Contains("pooler", StringComparison.OrdinalIgnoreCase) ||
                m.Contains("Postgres", StringComparison.OrdinalIgnoreCase) ||
                m.Contains("Session pooler", StringComparison.OrdinalIgnoreCase) ||
                m.Contains("TCP", StringComparison.OrdinalIgnoreCase) ||
                m.Contains("IPv6", StringComparison.OrdinalIgnoreCase) ||
                m.Contains("Tenant", StringComparison.OrdinalIgnoreCase) ||
                m.Contains("28P01", StringComparison.OrdinalIgnoreCase) ||
                m.Contains("XX000", StringComparison.OrdinalIgnoreCase))
                status = StatusCodes.Status503ServiceUnavailable;
        }
        else if (app.Environment.IsDevelopment())
        {
            message = ex.Message;
        }
        else
        {
            message = "An error occurred.";
        }

        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = message }));
    }
});
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
