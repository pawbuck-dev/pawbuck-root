namespace PawBuck.API.Services;

/// <summary>
/// Decides whether a vault document can skip clinical sync.
/// When owners delete structured rows, vault rows may still show as synced — re-sync in that case.
/// </summary>
public static class ClinicalDocumentSyncPolicy
{
    public static bool ShouldSkipSync(bool clinicalSyncedAtSet, bool clinicalRowsExistForDocument) =>
        clinicalSyncedAtSet && clinicalRowsExistForDocument;
}
