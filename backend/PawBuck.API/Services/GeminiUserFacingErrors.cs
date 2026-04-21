namespace PawBuck.API.Services;

/// <summary>
/// Maps Gemini HTTP failures to short admin/support-facing text (no secrets).
/// </summary>
public static class GeminiUserFacingErrors
{
    public static string FromExceptionMessage(string? message)
    {
        if (string.IsNullOrEmpty(message))
            return "Gemini request failed.";

        if (message.Contains("leaked", StringComparison.OrdinalIgnoreCase)
            || message.Contains("PERMISSION_DENIED", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Forbidden", StringComparison.OrdinalIgnoreCase)
            || message.Contains("403", StringComparison.Ordinal))
        {
            return "Google Gemini denied access (403). This usually means the API key was leaked, revoked, or invalid. "
                   + "Create a new key in Google AI Studio, set Gemini:ApiKey or environment variable GOOGLE_GEMINI_API_KEY, and restart the API. Do not commit API keys to the repository.";
        }

        if (message.Contains("API_KEY_INVALID", StringComparison.OrdinalIgnoreCase)
            || message.Contains("API key not valid", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Gemini API error: 400", StringComparison.OrdinalIgnoreCase)
            || (message.Contains("BadRequest", StringComparison.OrdinalIgnoreCase)
                && message.Contains("API error", StringComparison.OrdinalIgnoreCase)))
        {
            return "Google Gemini rejected the API key (400). Use a Generative Language / AI Studio API key under configuration key Gemini:ApiKey (not Admin:ApiKey). "
                   + "The key must match exactly (often starts with \"AIza\"). Set it in appsettings.Local.json or GOOGLE_GEMINI_API_KEY, then restart the API.";
        }

        return message;
    }
}
