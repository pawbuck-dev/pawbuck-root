using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

/// <summary>
/// Admin-only Milo classification preview (in-memory, no storage). For support/testing.
/// </summary>
[ApiController]
[Route("api/support/milo")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportMiloClassifyController : ControllerBase
{
    /// <summary>Maximum decoded file size (bytes) for preview classification.</summary>
    internal const int MaxDecodedBytes = 20 * 1024 * 1024;

    private readonly ClassificationService _classification;
    private readonly IMiloVisionService _miloVision;
    private readonly IMiloPromptProvider _promptProvider;
    private readonly ILogger<SupportMiloClassifyController> _logger;

    public SupportMiloClassifyController(
        ClassificationService classification,
        IMiloVisionService miloVision,
        IMiloPromptProvider promptProvider,
        ILogger<SupportMiloClassifyController> logger)
    {
        _classification = classification;
        _miloVision = miloVision;
        _promptProvider = promptProvider;
        _logger = logger;
    }

    /// <summary>
    /// Classify uploaded document bytes in-memory (no Postgres or storage). Returns the same shape as <c>/api/document/classify</c>.
    /// </summary>
    [HttpPost("classify-preview")]
    [ProducesResponseType(typeof(ClassifyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ClassifyPreview(
        [FromBody] ClassifyPreviewRequest? request,
        CancellationToken cancellationToken)
    {
        if (request == null)
            return BadRequest(new { error = "Request body is required." });

        if (string.IsNullOrWhiteSpace(request.FileBase64))
            return BadRequest(new { error = "FileBase64 is required." });

        var b64 = StripDataUrlPrefix(request.FileBase64.Trim());

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(b64);
        }
        catch (FormatException)
        {
            return BadRequest(new { error = "FileBase64 is not valid base64." });
        }

        if (bytes.Length == 0)
            return BadRequest(new { error = "Decoded file is empty." });

        if (bytes.Length > MaxDecodedBytes)
        {
            _logger.LogWarning("Classify-preview rejected: decoded size {Size} exceeds max {Max}", bytes.Length, MaxDecodedBytes);
            return BadRequest(new { error = $"File exceeds maximum size ({MaxDecodedBytes / (1024 * 1024)} MB)." });
        }

        var mime = string.IsNullOrWhiteSpace(request.MimeType) ? "image/jpeg" : request.MimeType.Trim();

        var response = await _classification.ClassifyFromBytesAsync(bytes, mime, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Classify then run flexible vault extraction (same JSON schema as Milo vision — title, summary, keyFacts, etc.).
    /// </summary>
    [HttpPost("classify-extract-preview")]
    [ProducesResponseType(typeof(MiloClassifyExtractPreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ClassifyExtractPreview(
        [FromBody] ClassifyPreviewRequest? request,
        CancellationToken cancellationToken)
    {
        if (request == null)
            return BadRequest(new { error = "Request body is required." });

        if (string.IsNullOrWhiteSpace(request.FileBase64))
            return BadRequest(new { error = "FileBase64 is required." });

        var b64 = StripDataUrlPrefix(request.FileBase64.Trim());

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(b64);
        }
        catch (FormatException)
        {
            return BadRequest(new { error = "FileBase64 is not valid base64." });
        }

        if (bytes.Length == 0)
            return BadRequest(new { error = "Decoded file is empty." });

        if (bytes.Length > MaxDecodedBytes)
        {
            _logger.LogWarning("Classify-extract-preview rejected: decoded size {Size} exceeds max {Max}", bytes.Length, MaxDecodedBytes);
            return BadRequest(new { error = $"File exceeds maximum size ({MaxDecodedBytes / (1024 * 1024)} MB)." });
        }

        var mime = string.IsNullOrWhiteSpace(request.MimeType) ? "image/jpeg" : request.MimeType.Trim();

        var classify = await _classification.ClassifyFromBytesAsync(bytes, mime, cancellationToken);
        var normalized = MiloVisionService.NormalizeVaultDocumentType(classify.DocumentType);
        var flexiblePrompt = _promptProvider.GetFlexibleExtractionPrompt(normalized);

        string? extractedJson = null;
        string? extractionError = null;
        try
        {
            extractedJson = await _miloVision.PreviewVaultExtractionAsync(bytes, mime, classify.DocumentType, cancellationToken);
        }
        catch (Exception ex)
        {
            extractionError = GeminiUserFacingErrors.FromExceptionMessage(ex.Message);
            _logger.LogWarning(ex, "Flexible extraction preview failed after classification");
        }

        return Ok(new MiloClassifyExtractPreviewResponse
        {
            DocumentType = classify.DocumentType,
            Confidence = classify.Confidence,
            Reasoning = MapClassificationReasoningForAdmin(classify.Reasoning),
            ExtractionPromptByType = classify.ExtractionPrompt,
            NormalizedDocumentType = normalized,
            FlexibleExtractionPrompt = flexiblePrompt,
            ExtractedJson = extractedJson,
            ExtractionError = extractionError,
        });
    }

    private static string StripDataUrlPrefix(string value)
    {
        if (!value.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            return value;
        var comma = value.IndexOf(',', StringComparison.Ordinal);
        return comma >= 0 && comma + 1 < value.Length ? value[(comma + 1)..] : value;
    }

    /// <summary>Keep model reasoning; only rewrite Gemini transport failures for the admin UI.</summary>
    private static string? MapClassificationReasoningForAdmin(string? reasoning)
    {
        if (string.IsNullOrWhiteSpace(reasoning))
            return reasoning;
        if (reasoning.Contains("API error:", StringComparison.OrdinalIgnoreCase))
            return GeminiUserFacingErrors.FromExceptionMessage(reasoning);
        return reasoning;
    }
}
