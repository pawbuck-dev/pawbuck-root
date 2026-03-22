using Microsoft.Extensions.Http.Resilience;
using PawBuck.API.Services;

var builder = WebApplication.CreateBuilder(args);

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

// RAG FAQ (Milo)
builder.Services.Configure<SupabaseOptions>(builder.Configuration.GetSection(SupabaseOptions.SectionName));
builder.Services.AddScoped<IEmbeddingService, GeminiEmbeddingService>();
builder.Services.AddScoped<IKnowledgeBaseService, KnowledgeBaseService>();
builder.Services.AddScoped<MiloRagService>();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
