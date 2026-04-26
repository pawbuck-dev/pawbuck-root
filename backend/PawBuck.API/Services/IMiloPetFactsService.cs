using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Loads pet health rows from Postgres (service connection); callers must verify access first.
/// </summary>
public interface IMiloPetFactsService
{
    /// <summary>
    /// Returns true when the pet exists, is not deleted, and <paramref name="userId"/> is the owner
    /// or has a <c>pet_family_grants</c> row (any role).
    /// </summary>
    Task<bool> VerifyPetAccessAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns <c>owner</c>, grant <c>role</c> text, or null when the user has no access to the pet.
    /// </summary>
    Task<string?> GetUserPetRoleAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    /// <summary>Same as <see cref="VerifyPetAccessAsync"/> (legacy name).</summary>
    Task<bool> VerifyPetOwnershipAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    Task<string> GetVaccinationsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    Task<string> GetMedicationsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    Task<string> GetLabResultsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    Task<string> GetClinicalExamsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    /// <summary>Recent owner journal notes (up to 5 rows, newest first).</summary>
    Task<string> GetJournalEntriesTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    /// <summary>Concatenates all four sections (vaccinations, medications, lab results, clinical exams).</summary>
    Task<string> GetHealthSummaryTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns recent rows with non-empty <c>document_url</c> for the kinds that were loaded for this chat turn
    /// (caller must have verified pet access). Merged, deduped by path, newest first, capped at <paramref name="maxCount"/>.
    /// </summary>
    Task<IReadOnlyList<MiloChatFileAttachment>> GetDocumentAttachmentsForPlanKindsAsync(
        Guid userId,
        Guid petId,
        IReadOnlyList<string> kinds,
        int maxCount,
        CancellationToken cancellationToken = default);
}
