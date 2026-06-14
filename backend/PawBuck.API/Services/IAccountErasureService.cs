namespace PawBuck.API.Services;

public sealed record AccountDeletionRequestRow(
    Guid Id,
    Guid UserId,
    DateTimeOffset PurgeAfter);

public sealed record AccountPurgeResult(
    Guid UserId,
    bool Success,
    IReadOnlyDictionary<string, long>? RowsSummary,
    string? ErrorMessage);

public interface IAccountErasureService
{
    Task<IReadOnlyList<AccountDeletionRequestRow>> GetPastDueDeletionRequestsAsync(
        int limit,
        CancellationToken cancellationToken);

    Task<AccountPurgeResult> PurgeUserAsync(Guid userId, CancellationToken cancellationToken);
}
