using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using Microsoft.Extensions.Options;

namespace PawBuck.API.Services;

/// <summary>
/// Uses Gemini <c>gemini-embedding-2</c> (768 dimensions via <c>output_dimensionality</c>) for RAG query embeddings.
/// Replaces retired <c>text-embedding-004</c> on Generative Language API v1beta.
/// </summary>
public class GeminiEmbeddingService : IEmbeddingService
{
    private static int _missingApiKeyLogged;

    private const string ModelName = "gemini-embedding-2";
    private const int EmbeddingDimensions = 768;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly JsonSerializerOptions EmbedRequestJson = new()
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<GeminiOptions> _options;
    private readonly ILogger<GeminiEmbeddingService> _logger;

    public GeminiEmbeddingService(
        IHttpClientFactory httpClientFactory,
        IOptions<GeminiOptions> options,
        ILogger<GeminiEmbeddingService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<float[]> GetEmbeddingAsync(string text, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            return new float[EmbeddingDimensions];

        var apiKey = _options.Value.ApiKey?.Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            apiKey = Environment.GetEnvironmentVariable("GOOGLE_GEMINI_API_KEY")?.Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            if (Interlocked.CompareExchange(ref _missingApiKeyLogged, 1, 0) == 0)
            {
                _logger.LogWarning(
                    "Gemini API key not configured. Set {ConfigKey} (e.g. appsettings.Local.json or user secrets) or environment variable {EnvVar}.",
                    "Gemini:ApiKey",
                    "GOOGLE_GEMINI_API_KEY");
            }

            return new float[EmbeddingDimensions];
        }

        var requestBody = new GeminiEmbedContentRequest
        {
            Content = new GeminiEmbedContent { Parts = new[] { new GeminiEmbedPart { Text = text } } },
            OutputDimensionality = EmbeddingDimensions,
        };

        var client = _httpClientFactory.CreateClient("Gemini");
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{ModelName}:embedContent";
        using var requestContent = new StringContent(
            JsonSerializer.Serialize(requestBody, EmbedRequestJson),
            Encoding.UTF8,
            "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = requestContent };
        request.SetGeminiApiKey(apiKey);

        var response = await client.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Gemini embed API returned {StatusCode}: {Body}", response.StatusCode, body);
            return new float[EmbeddingDimensions];
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var embedding = root.GetProperty("embedding").GetProperty("values");
        var result = new float[embedding.GetArrayLength()];
        for (var i = 0; i < result.Length; i++)
            result[i] = (float)embedding[i].GetDouble();
        return result;
    }

    private sealed class GeminiEmbedContentRequest
    {
        [JsonPropertyName("content")]
        public GeminiEmbedContent Content { get; init; } = new();

        [JsonPropertyName("output_dimensionality")]
        public int OutputDimensionality { get; init; }
    }

    private sealed class GeminiEmbedContent
    {
        [JsonPropertyName("parts")]
        public GeminiEmbedPart[] Parts { get; init; } = Array.Empty<GeminiEmbedPart>();
    }

    private sealed class GeminiEmbedPart
    {
        [JsonPropertyName("text")]
        public string Text { get; init; } = "";
    }
}
