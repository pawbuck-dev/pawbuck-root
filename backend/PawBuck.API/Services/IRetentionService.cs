namespace PawBuck.API.Services;

public sealed record RetentionJobRunRow(
    Guid Id,
    string JobName,
    DateTimeOffset RanAt,
    long RowsAffected,
    string? DetailsJson);

public interface IRetentionService
{
    Task RunAllJobsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<RetentionJobRunRow>> GetRecentRunsAsync(int limit, CancellationToken cancellationToken);
}
