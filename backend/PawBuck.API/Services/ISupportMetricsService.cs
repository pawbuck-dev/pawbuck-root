using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ISupportMetricsService
{
    Task<SupportMetricsResponse> GetMetricsAsync(CancellationToken cancellationToken = default);
}
