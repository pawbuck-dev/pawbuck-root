using System.Net.Http;

namespace PawBuck.API.Services;

/// <summary>
/// Use the <c>x-goog-api-key</c> header instead of <c>?key=</c> on the URL so HttpClient logging does not capture secrets.
/// </summary>
public static class GeminiGenerativeLanguageHttp
{
    public const string ApiKeyHeaderName = "x-goog-api-key";

    public static void SetGeminiApiKey(this HttpRequestMessage request, string apiKey)
    {
        request.Headers.Remove(ApiKeyHeaderName);
        if (!string.IsNullOrEmpty(apiKey))
            request.Headers.TryAddWithoutValidation(ApiKeyHeaderName, apiKey);
    }
}
