namespace PawBuck.API.Models;

/// <summary>
/// Admin harness: classification + flexible vault extraction (same prompts/schema as Milo vision pipeline).
/// </summary>
public class MiloClassifyExtractPreviewResponse
{
    public string DocumentType { get; set; } = string.Empty;

    public double Confidence { get; set; }

    public string? Reasoning { get; set; }

    /// <summary>Prompt from GetPromptForType (medical-record JSON schema).</summary>
    public string ExtractionPromptByType { get; set; } = string.Empty;

    /// <summary>Normalized type used for pet_documents and flexible extraction.</summary>
    public string NormalizedDocumentType { get; set; } = string.Empty;

    /// <summary>Flexible vault prompt (GetFlexibleExtractionPrompt).</summary>
    public string FlexibleExtractionPrompt { get; set; } = string.Empty;

    /// <summary>JSON string from Gemini (title, summary, primaryDate, keyFacts, confidenceScore).</summary>
    public string? ExtractedJson { get; set; }

    /// <summary>Set when flexible extraction failed after a successful classification.</summary>
    public string? ExtractionError { get; set; }
}
