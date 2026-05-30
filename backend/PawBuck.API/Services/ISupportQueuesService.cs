using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ISupportQueuesService
{
    Task<SupportQueuesSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken = default);
}
