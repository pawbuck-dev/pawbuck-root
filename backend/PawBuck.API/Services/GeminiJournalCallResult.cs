namespace PawBuck.API.Services;

/// <summary>Result of journal-only Gemini generateContent calls (includes retry exhaustion).</summary>
public readonly record struct GeminiJournalCallResult(bool Success, string? Text, string? UserFacingMessage)
{
    public const string NappingMessage = "Milo's assistant is napping...";

    public static GeminiJournalCallResult Ok(string text) => new(true, text, null);

    public static GeminiJournalCallResult Napping() => new(false, null, NappingMessage);
}
