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
}
