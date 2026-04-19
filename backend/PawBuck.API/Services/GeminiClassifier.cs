using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace PawBuck.API.Services;

/// <summary>
/// Classifies pet documents using the Gemini Vision API with retry on throttling.
/// </summary>
public class GeminiClassifier : IDocumentClassifier
{
    private const string GeminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<GeminiOptions> _options;
    private readonly IMiloPromptProvider _prompts;
    private readonly ILogger<GeminiClassifier> _logger;

    public GeminiClassifier(
        IHttpClientFactory httpClientFactory,
        IOptions<GeminiOptions> options,
        IMiloPromptProvider prompts,
        ILogger<GeminiClassifier> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options;
        _prompts = prompts;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<DocumentClassificationResult> ClassifyAsync(string imageUrl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            return new DocumentClassificationResult { Type = "irrelevant", Confidence = 0, Reasoning = "No image URL provided." };
        }

        string? base64Image = null;
        string? mimeType = null;

        try
        {
            var downloadClient = _httpClientFactory.CreateClient("DocumentImageDownload");
            var response = await downloadClient.GetAsync(imageUrl, cancellationToken);
            response.EnsureSuccessStatusCode();
            var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            base64Image = Convert.ToBase64String(bytes);
            mimeType = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to download image from {ImageUrl}", imageUrl);
            return new DocumentClassificationResult { Type = "irrelevant", Confidence = 0, Reasoning = "Failed to download image." };
        }

        var apiKey = _options.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("GOOGLE_GEMINI_API_KEY not configured");
            return new DocumentClassificationResult { Type = "Irrelevant", Confidence = 0, Reasoning = "API key not configured." };
        }

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = _prompts.PetDocumentClassificationPrompt },
                        new
                        {
                            inline_data = new
                            {
                                mime_type = mimeType,
                                data = base64Image
                            }
                        }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.1,
                response_mime_type = "application/json",
                response_schema = new
                {
                    type = "object",
                    properties = new
                    {
                        documentType = new
                        {
                            type = "string",
                            @enum = new[]
                            {
                                "medications", "lab_results", "clinical_exams", "vaccinations", "billing_invoice",
                                "travel_certificate", "insurance_policy", "pedigree", "identity_document", "irrelevant"
                            }
                        },
                        confidence = new { type = "number" },
                        reasoning = new { type = "string" }
                    },
                    required = new[] { "documentType", "confidence", "reasoning" }
                }
            }
        };

        var geminiClient = _httpClientFactory.CreateClient("Gemini");
        var model = string.IsNullOrWhiteSpace(_options.Value.Model) ? "gemini-1.5-flash" : _options.Value.Model!.Trim();
        var url = $"{GeminiBaseUrl}{model}:generateContent?key={apiKey}";
        using var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };

        var httpResponse = await geminiClient.SendAsync(request, cancellationToken);

        if (!httpResponse.IsSuccessStatusCode)
        {
            var body = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Gemini API returned {StatusCode}: {Body}", httpResponse.StatusCode, body);
            return new DocumentClassificationResult
            {
                Type = "irrelevant",
                Confidence = 0,
                Reasoning = $"API error: {httpResponse.StatusCode}"
            };
        }

        var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        string type = "irrelevant";
        double confidence = 0;
        string? reasoning = null;

        try
        {
            var candidate = root.GetProperty("candidates")[0];
            var parts = candidate.GetProperty("content").GetProperty("parts");
            var text = parts[0].GetProperty("text").GetString();
            if (!string.IsNullOrEmpty(text))
            {
                var parsed = JsonSerializer.Deserialize<PetDocClassificationJson>(text, JsonOptions);
                if (parsed != null)
                {
                    type = parsed.DocumentType ?? type;
                    confidence = parsed.Confidence;
                    reasoning = parsed.Reasoning;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Gemini classification response");
        }

        return new DocumentClassificationResult { Type = type, Confidence = confidence, Reasoning = reasoning };
    }

    private sealed class PetDocClassificationJson
    {
        public string? DocumentType { get; set; }
        public double Confidence { get; set; }
        public string? Reasoning { get; set; }
    }
}

/// <summary>
/// Configuration for Gemini API.
/// </summary>
public class GeminiOptions
{
    public const string SectionName = "Gemini";
    /// <summary>API key (or set GOOGLE_GEMINI_API_KEY env var).</summary>
    public string? ApiKey { get; set; }

    /// <summary>Model id for vision/classification (default gemini-1.5-flash). Aligned with Milo document pipeline.</summary>
    public string? Model { get; set; }
}
