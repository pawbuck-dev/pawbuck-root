namespace PawBuck.API.Services;

/// <summary>Token usage from Gemini <c>usageMetadata</c> when present.</summary>
public sealed class GeminiUsageMetadata
{
    public int? PromptTokenCount { get; init; }
    public int? CandidatesTokenCount { get; init; }
    public int? TotalTokenCount { get; init; }
}
