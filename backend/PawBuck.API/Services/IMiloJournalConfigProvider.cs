using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface IMiloJournalConfigProvider
{
    Task<MiloJournalConfigSnapshot> GetAsync(CancellationToken cancellationToken = default);
}
