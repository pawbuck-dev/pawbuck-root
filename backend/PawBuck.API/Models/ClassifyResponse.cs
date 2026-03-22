namespace PawBuck.API.Models;

/// <summary>
/// Response after classifying a pet document: type and the Milo extraction prompt for that type.
/// </summary>
public class ClassifyResponse
{
    /// <summary>Classified document type: Vaccine, Invoice, or Prescription.</summary>
    public string DocumentType { get; set; } = string.Empty;

    /// <summary>Confidence score 0–100 from the classifier.</summary>
    public double Confidence { get; set; }

    /// <summary>Reasoning from the classifier (optional).</summary>
    public string? Reasoning { get; set; }

    /// <summary>Milo extraction prompt to use for structured extraction of this document type.</summary>
    public string ExtractionPrompt { get; set; } = string.Empty;
}
