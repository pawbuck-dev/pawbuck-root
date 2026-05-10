using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface IMiloHealthBundleService
{
    Task<MiloHealthBundleResponse> ProcessBundleAsync(
        Guid userId,
        string bearerToken,
        MiloHealthBundleRequest request,
        CancellationToken cancellationToken = default);
}
