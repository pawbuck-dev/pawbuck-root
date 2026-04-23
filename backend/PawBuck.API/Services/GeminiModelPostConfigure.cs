using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace PawBuck.API.Services;

/// <summary>
/// Remaps legacy <c>gemini-1.5-*</c> short model ids that often 404 on <c>v1beta</c> with AI Studio keys.
/// </summary>
internal sealed class GeminiModelPostConfigure : IPostConfigureOptions<GeminiOptions>
{
    private readonly ILogger<GeminiModelPostConfigure> _logger;

    public GeminiModelPostConfigure(ILogger<GeminiModelPostConfigure> logger) => _logger = logger;

    public void PostConfigure(string? name, GeminiOptions options)
    {
        var m = options.Model?.Trim();
        if (string.IsNullOrEmpty(m) || !GeminiOptions.IsLikelyUnsupportedGenerativeLanguageModel(m))
            return;

        _logger.LogWarning(
            "Gemini:Model \"{Model}\" is not available for generateContent on the Generative Language API with typical AI Studio keys. Using \"{Default}\". Remove Gemini__Model / GEMINI_MODEL from ECS or set to a supported id (see GeminiOptions.DefaultModelId).",
            m,
            GeminiOptions.DefaultModelId);
        options.Model = GeminiOptions.DefaultModelId;
    }
}
