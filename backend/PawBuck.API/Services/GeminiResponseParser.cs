using System.Text.Json;

namespace PawBuck.API.Services;

/// <summary>Parses common fields from Gemini Generative Language API JSON responses.</summary>
public static class GeminiResponseParser
{
    public static bool TryExtractCandidateText(string json, out string? text)
    {
        text = null;
        if (string.IsNullOrWhiteSpace(json))
            return false;

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                return false;

            var parts = candidates[0].GetProperty("content").GetProperty("parts");
            if (parts.GetArrayLength() == 0)
                return false;

            text = parts[0].GetProperty("text").GetString();
            return !string.IsNullOrWhiteSpace(text);
        }
        catch
        {
            return false;
        }
    }

    public static GeminiUsageMetadata? TryParseUsageMetadata(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("usageMetadata", out var usage))
                return null;

            return new GeminiUsageMetadata
            {
                PromptTokenCount = TryReadInt(usage, "promptTokenCount"),
                CandidatesTokenCount = TryReadInt(usage, "candidatesTokenCount"),
                TotalTokenCount = TryReadInt(usage, "totalTokenCount"),
            };
        }
        catch
        {
            return null;
        }
    }

    private static int? TryReadInt(JsonElement parent, string name)
    {
        if (!parent.TryGetProperty(name, out var el))
            return null;
        if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out var n))
            return n;
        return null;
    }
}
