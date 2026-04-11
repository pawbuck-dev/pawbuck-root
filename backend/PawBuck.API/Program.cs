using Microsoft.Extensions.Http.Resilience;
using Microsoft.Extensions.Options;
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

builder.Services.AddHttpClient(SupabaseConnectionStringNormalizer.DohHttpClientName, client =>
{
    client.Timeout = TimeSpan.FromSeconds(8);
});
builder.Services.AddSingleton<IPostConfigureOptions<SupabaseOptions>, SupabaseOptionsPostConfigure>();
builder.Services.AddSingleton<SupabaseClientAccessor>();

builder.Services.Configure<AdminOptions>(builder.Configuration.GetSection(AdminOptions.SectionName));
if (string.IsNullOrWhiteSpace(builder.Configuration["Admin:ApiKey"]))
{
    var k = Environment.GetEnvironmentVariable("ADMIN_API_KEY");
    if (!string.IsNullOrWhiteSpace(k))
        builder.Services.PostConfigure<AdminOptions>(o => o.ApiKey ??= k);
}

// RAG FAQ (Milo)
builder.Services.Configure<MiloOptions>(builder.Configuration.GetSection(MiloOptions.SectionName));
builder.Services.AddScoped<IEmbeddingService, GeminiEmbeddingService>();
builder.Services.AddScoped<IKnowledgeBaseService, KnowledgeBaseService>();
builder.Services.AddScoped<MiloRagService>();
builder.Services.AddScoped<IMiloCuratedSnippetsService, MiloCuratedSnippetsService>();

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

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000")
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
app.UseAuthorization();
app.MapControllers();

app.Run();
