using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Maps <c>pet_documents.extracted_json</c> into clinical tables (vaccinations, medicines, exams, labs).</summary>
public interface IPetDocumentClinicalSyncService
{
    /// <summary>Claims up to <paramref name="maxRows"/> pending vault rows and syncs each (marks <c>clinical_synced_at</c>).</summary>
    Task<int> ProcessPendingDocumentsAsync(int maxRows, CancellationToken cancellationToken = default);

    /// <summary>Sync one vault document immediately after analyze (idempotent when already synced).</summary>
    Task<PetDocumentClinicalSyncResult> SyncDocumentByIdAsync(Guid documentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes clinical rows linked to the document, clears <c>clinical_synced_at</c>, and re-runs sync.
    /// </summary>
    Task<PetDocumentClinicalSyncResult> ResyncDocumentByIdAsync(Guid documentId, CancellationToken cancellationToken = default);
}
