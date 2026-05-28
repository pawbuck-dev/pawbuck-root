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
            return "Google Gemini denied access (403). The key may be revoked, leaked, or not allowed for the Generative Language API. "
                   + "Create a new key in Google AI Studio (https://aistudio.google.com/apikey), then set Gemini:ApiKey, environment variable Gemini__ApiKey or GOOGLE_GEMINI_API_KEY, or (on ECS) inject Gemini__ApiKey from AWS Secrets Manager (see docs/AWS.md). Restart the API after changing configuration.";
        }

        if (message.Contains("API_KEY_INVALID", StringComparison.OrdinalIgnoreCase)
            || message.Contains("API key not valid", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Gemini API error: 400", StringComparison.OrdinalIgnoreCase)
            || (message.Contains("BadRequest", StringComparison.OrdinalIgnoreCase)
                && message.Contains("API error", StringComparison.OrdinalIgnoreCase)))
        {
            return "Google Gemini rejected the API key (400). Use an API key from Google AI Studio (https://aistudio.google.com/apikey) enabled for the Generative Language API. "
                   + "Set Gemini:ApiKey (appsettings.Local.json), environment variable Gemini__ApiKey or GOOGLE_GEMINI_API_KEY, or on ECS the container secret Gemini__ApiKey from Secrets Manager (docs/AWS.md). "
                   + "The value must match the key exactly (typically starts with \"AIza\"). Do not use Admin:ApiKey unless it is that same AI Studio key; remove stray quotes or whitespace. Restart the API after changes.";
        }

        if (message.Contains("didn't complete within the allowed timeout", StringComparison.OrdinalIgnoreCase)
            || message.Contains("TimeoutRejectedException", StringComparison.OrdinalIgnoreCase)
            || message.Contains("The operation was canceled", StringComparison.OrdinalIgnoreCase))
        {
            return "Gemini vision took too long for this document. Try again or use a smaller/clearer scan.";
        }

        return message;
    }
}
