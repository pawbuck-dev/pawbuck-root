using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Handles document classification orchestration: classify via Vision API then look up Milo extraction prompt.
/// </summary>
public class ClassificationService
{
    private readonly IDocumentClassifier _classifier;
    private readonly IMiloPromptProvider _promptProvider;
    private readonly ILogger<ClassificationService> _logger;

    public ClassificationService(
        IDocumentClassifier classifier,
        IMiloPromptProvider promptProvider,
        ILogger<ClassificationService> logger)
    {
        _classifier = classifier;
        _promptProvider = promptProvider;
        _logger = logger;
    }

    /// <summary>
    /// Classifies the document at the given image URL and returns the classification plus the Milo extraction prompt for that type.
    /// </summary>
    public async Task<ClassifyResponse> ClassifyAsync(string imageUrl, CancellationToken cancellationToken = default)
    {
        var result = await _classifier.ClassifyAsync(imageUrl, cancellationToken);

        var extractionPrompt = _promptProvider.GetPromptForType(result.Type);

        _logger.LogInformation(
            "Classified document as {Type} (confidence: {Confidence})",
            result.Type,
            result.Confidence);

        return new ClassifyResponse
        {
            DocumentType = result.Type,
            Confidence = result.Confidence,
            Reasoning = result.Reasoning,
            ExtractionPrompt = extractionPrompt
        };
    }

    /// <summary>
    /// Classifies raw document bytes (e.g. admin preview harness) and returns the same shape as <see cref="ClassifyAsync"/>.
    /// </summary>
    public async Task<ClassifyResponse> ClassifyFromBytesAsync(
        byte[] content,
        string mimeType,
        CancellationToken cancellationToken = default)
    {
        var result = await _classifier.ClassifyFromBytesAsync(content, mimeType, cancellationToken);

        var extractionPrompt = _promptProvider.GetPromptForType(result.Type);

        _logger.LogInformation(
            "Classified document bytes as {Type} (confidence: {Confidence})",
            result.Type,
            result.Confidence);

        return new ClassifyResponse
        {
            DocumentType = result.Type,
            Confidence = result.Confidence,
            Reasoning = result.Reasoning,
            ExtractionPrompt = extractionPrompt
        };
    }
}
