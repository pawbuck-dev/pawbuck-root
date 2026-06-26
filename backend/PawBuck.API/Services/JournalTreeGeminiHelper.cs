using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace PawBuck.API.Services;

public interface IJournalTreeGeminiHelper
{
    Task<(string TreeId, double Confidence)?> RouteTopicAsync(
        string userMessage,
        IReadOnlyList<string> availableTreeIds,
        CancellationToken cancellationToken = default);

    Task<string?> PolishSummaryAsync(
        string plainSummary,
        string petName,
        CancellationToken cancellationToken = default);
}

/// <summary>Gemini assist for journal tree topic routing and summary polish (optional when API key missing).</summary>
public sealed class JournalTreeGeminiHelper : IJournalTreeGeminiHelper
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IGeminiGenerateContentService _geminiGenerate;
    private readonly IOptions<GeminiOptions> _options;
    private readonly ILogger<JournalTreeGeminiHelper> _logger;

    public JournalTreeGeminiHelper(
        IGeminiGenerateContentService geminiGenerate,
        IOptions<GeminiOptions> options,
        ILogger<JournalTreeGeminiHelper> logger)
    {
        _geminiGenerate = geminiGenerate;
        _options = options;
        _logger = logger;
    }

    public async Task<(string TreeId, double Confidence)?> RouteTopicAsync(
        string userMessage,
        IReadOnlyList<string> availableTreeIds,
        CancellationToken cancellationToken = default)
    {
        var apiKey = _options.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey) || availableTreeIds.Count == 0)
            return null;

        var trees = string.Join(", ", availableTreeIds);
        var prompt =
            "Pick the best journal symptom tree for this pet owner message. " +
            $"Reply with JSON only: {{\"treeId\":\"<one of: {trees}>\",\"confidence\":0.0-1.0}}. " +
            "If unclear, use confidence below 0.5.\n\nMessage: " + userMessage.Trim();

        var text = await GenerateAsync(apiKey, prompt, temperature: 0.1, maxTokens: 128, jsonMode: true, cancellationToken);
        if (string.IsNullOrWhiteSpace(text))
            return null;

        try
        {
            var json = ExtractJsonObject(text);
            var parsed = JsonSerializer.Deserialize<RouteResult>(json, JsonOptions);
            if (parsed == null || string.IsNullOrWhiteSpace(parsed.TreeId))
                return null;
            var id = parsed.TreeId.Trim();
            if (!availableTreeIds.Contains(id, StringComparer.OrdinalIgnoreCase))
                return null;
            var conf = parsed.Confidence is >= 0 and <= 1 ? parsed.Confidence : 0.5;
            return (id, conf);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to parse journal tree route JSON");
            return null;
        }
    }

    public async Task<string?> PolishSummaryAsync(
        string plainSummary,
        string petName,
        CancellationToken cancellationToken = default)
    {
        var apiKey = _options.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(plainSummary))
            return null;

        var prompt =
            $"Rewrite this pet health journal draft for {petName} in clear, neutral clinical note style. " +
            "Keep the same labeled fields (KEY: value lines). Do not diagnose or prescribe. " +
            "Output only the note text.\n\n" + plainSummary.Trim();

        return await GenerateAsync(apiKey, prompt, temperature: 0.35, maxTokens: 512, jsonMode: false, cancellationToken);
    }

    private async Task<string?> GenerateAsync(
        string apiKey,
        string prompt,
        double temperature,
        int maxTokens,
        bool jsonMode,
        CancellationToken cancellationToken)
    {
        var model = string.IsNullOrWhiteSpace(_options.Value.Model)
            ? GeminiOptions.DefaultModelId
            : _options.Value.Model!.Trim();

        object generationConfig = jsonMode
            ? new { temperature, maxOutputTokens = maxTokens, responseMimeType = "application/json" }
            : new { temperature, maxOutputTokens = maxTokens };

        var requestBody = new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } },
            generationConfig,
        };

        var result = await _geminiGenerate.GenerateContentAsync(
            GeminiCallKind.JournalTree,
            model,
            requestBody,
            apiKey,
            cancellationToken);

        if (!result.Success)
        {
            _logger.LogDebug(
                "Journal Gemini helper HTTP {Status}: {Body}",
                result.StatusCode,
                result.ResponseJson.Length > 200 ? result.ResponseJson[..200] : result.ResponseJson);
            return null;
        }

        return GeminiResponseParser.TryExtractCandidateText(result.ResponseJson, out var text) ? text?.Trim() : null;
    }

    private static string ExtractJsonObject(string text)
    {
        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start >= 0 && end > start)
            return text[start..(end + 1)];
        return text.Trim();
    }

    private sealed class RouteResult
    {
        [JsonPropertyName("treeId")]
        public string? TreeId { get; set; }

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }
    }
}
