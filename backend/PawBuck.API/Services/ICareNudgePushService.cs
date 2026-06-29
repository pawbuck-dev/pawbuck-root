using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ICareNudgePushService
{
    Task<CareNudgeRunResultDto> RunPushCycleAsync(CancellationToken cancellationToken = default);
}
