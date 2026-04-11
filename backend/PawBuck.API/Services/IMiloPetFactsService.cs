namespace PawBuck.API.Services;

/// <summary>
/// Loads pet health rows from Postgres with <c>user_id</c>/<c>pet_id</c> scoping (no cross-tenant reads).
/// </summary>
public interface IMiloPetFactsService
{
    /// <summary>
    /// Returns true when the pet exists, is not deleted, and <paramref name="userId"/> is the owner.
    /// </summary>
    Task<bool> VerifyPetOwnershipAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    Task<string> GetVaccinationsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    Task<string> GetMedicationsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    Task<string> GetLabResultsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    Task<string> GetClinicalExamsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    /// <summary>Concatenates all four sections (vaccinations, medications, lab results, clinical exams).</summary>
    Task<string> GetHealthSummaryTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);
}
