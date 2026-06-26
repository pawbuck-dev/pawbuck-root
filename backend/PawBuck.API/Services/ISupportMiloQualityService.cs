using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ISupportMiloQualityService
{
    Task<SupportMiloQualityOverviewResponse> GetOverviewAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default);

    Task<SupportMiloQualityOutcomesResponse> ListOutcomesAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        Guid? petId,
        Guid? userId,
        string? surface,
        string? outcome,
        string? failureCode,
        int limit,
        CancellationToken cancellationToken = default);
}
