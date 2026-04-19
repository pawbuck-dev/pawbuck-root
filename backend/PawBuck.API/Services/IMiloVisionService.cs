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
}
