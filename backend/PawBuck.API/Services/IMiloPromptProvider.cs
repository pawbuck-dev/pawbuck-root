namespace PawBuck.API.Services;

/// <summary>
/// Central library for Milo extraction prompts by document type.
/// Look up the corresponding extraction prompt after classification.
/// </summary>
public interface IMiloPromptProvider
{
    /// <summary>
    /// Returns the Milo extraction prompt for the given document type (Vaccine, Invoice, Prescription, etc.).
    /// </summary>
    string GetPromptForType(string documentType);

    /// <summary>
    /// Multimodal classification prompt (aligned with @pawbuck/milo PET_DOCUMENT_CLASSIFICATION_SYSTEM_PROMPT).
    /// </summary>
    string PetDocumentClassificationPrompt { get; }

    /// <summary>
    /// Flexible vault extraction prompt (aligned with @pawbuck/milo FLEXIBLE_DOCUMENT_EXTRACTION_SYSTEM_PROMPT).
    /// </summary>
    string GetFlexibleExtractionPrompt(string documentType);
}
