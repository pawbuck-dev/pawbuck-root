using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface IMiloNudgeCopyService
{
    MiloNudgeCopyResponse GetTemplateFallback(MiloNudgeCopyRequest request);

    Task<MiloNudgeCopyResponse> GenerateCopyAsync(
        MiloNudgeCopyRequest request,
        Guid? userId,
        Guid? petId,
        CancellationToken cancellationToken = default);
}
