namespace PawBuck.API.Services;

/// <summary>Maps <c>pet_documents.extracted_json</c> into <c>vaccinations</c> / <c>medicines</c> rows.</summary>
public interface IPetDocumentClinicalSyncService
{
    /// <summary>Claims up to <paramref name="maxRows"/> pending vault rows and syncs each (marks <c>clinical_synced_at</c>).</summary>
    Task<int> ProcessPendingDocumentsAsync(int maxRows, CancellationToken cancellationToken = default);
}
