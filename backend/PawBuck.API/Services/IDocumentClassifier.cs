namespace PawBuck.API.Services;

/// <summary>
/// Classifies pet documents (image at URL) into Vaccine, Invoice, or Prescription using Vision AI.
/// </summary>
public interface IDocumentClassifier
{
    /// <summary>
    /// Classifies the document at the given image URL.
    /// </summary>
    /// <param name="imageUrl">Public URL of the document image.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Classification result (type, confidence, reasoning).</returns>
    Task<DocumentClassificationResult> ClassifyAsync(string imageUrl, CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of document classification from the Vision API.
/// </summary>
public class DocumentClassificationResult
{
    /// <summary>One of: Vaccine, Invoice, Prescription, or Irrelevant.</summary>
    public string Type { get; set; } = "Irrelevant";

    /// <summary>Confidence 0–100.</summary>
    public double Confidence { get; set; }

    /// <summary>Optional reasoning from the model.</summary>
    public string? Reasoning { get; set; }
}
