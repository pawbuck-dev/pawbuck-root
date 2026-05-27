using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ISupportDocumentProcessingService
{
    Task<SupportDocumentProcessingMetricsResponse> GetMetricsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default);
}
