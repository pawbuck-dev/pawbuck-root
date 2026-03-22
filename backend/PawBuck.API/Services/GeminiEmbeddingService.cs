using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace PawBuck.API.Services;

/// <summary>
/// Uses Gemini text-embedding-004 (768 dimensions) to vectorize text for RAG retrieval.
/// </summary>
public class GeminiEmbeddingService : IEmbeddingService
{
    private const string ModelName = "text-embedding-004";
    private const int EmbeddingDimensions = 768;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

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

        var apiKey = _options.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("GOOGLE_GEMINI_API_KEY not configured");
            return new float[EmbeddingDimensions];
        }

        var requestBody = new
        {
            content = new { parts = new[] { new { text } } }
        };

        var client = _httpClientFactory.CreateClient("Gemini");
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{ModelName}:embedContent?key={apiKey}";
        using var requestContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = requestContent };

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
}
