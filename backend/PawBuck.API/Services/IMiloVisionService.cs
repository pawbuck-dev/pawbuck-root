using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Milo vision pipeline: download from Supabase Storage, Gemini classify + extract, persist <c>pet_documents</c>.
/// </summary>
public interface IMiloVisionService
{
    /// <param name="bearerToken">Supabase user JWT (Authorization Bearer) for storage download.</param>
    Task<PetDocumentVaultRowDto> AnalyzeAndPersistAsync(
        Guid userId,
        string bearerToken,
        AnalyzePetDocumentRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Same pipeline using <see cref="SupabaseOptions.ServiceRoleKey"/> for Storage download (Edge / email pipeline).
    /// Caller must authorize; controller uses internal service key.
    /// </summary>
    Task<PetDocumentVaultRowDto> AnalyzeAndPersistInternalAsync(
        AnalyzePetDocumentInternalRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin preview only: run the same flexible vault JSON extraction as the document pipeline (no storage/DB).
    /// </summary>
    /// <param name="bytes">Raw file bytes (image or PDF).</param>
    /// <param name="mimeType">MIME type for Gemini inline_data.</param>
    /// <param name="classifiedDocumentType">Raw type string from the classifier (normalized internally).</param>
    Task<string> PreviewFlexibleExtractionAsync(
        byte[] bytes,
        string mimeType,
        string classifiedDocumentType,
        CancellationToken cancellationToken = default);
}
