using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface IMiloJournalFeedbackAggregateService
{
    Task<MiloJournalFeedbackAggregatesDto> GetAggregatesAsync(CancellationToken cancellationToken = default);
}
