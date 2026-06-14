namespace PawBuck.API.Services;

public sealed record DataExportRequestRow(
    Guid Id,
    Guid UserId,
    string Status,
    string? FilePath,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset CreatedAt);

public sealed record PrivacyExportBundle(
    string Version,
    DateTimeOffset ExportedAt,
    Guid UserId,
    IReadOnlyDictionary<string, object?> Sections);

public interface IPrivacyExportService
{
    IReadOnlyList<string> ExportTableNames { get; }

    Task<PrivacyExportBundle> BuildBundleAsync(Guid userId, CancellationToken cancellationToken);

    Task<Guid> QueueExportAsync(Guid userId, CancellationToken cancellationToken);

    Task<DataExportRequestRow?> GetLatestStatusAsync(Guid userId, CancellationToken cancellationToken);

    Task<IReadOnlyList<DataExportRequestRow>> GetQueuedRequestsAsync(
        int limit,
        CancellationToken cancellationToken);

    Task MarkRunningAsync(Guid requestId, CancellationToken cancellationToken);

    Task MarkReadyAsync(
        Guid requestId,
        string filePath,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken);

    Task MarkFailedAsync(Guid requestId, string error, CancellationToken cancellationToken);
}
