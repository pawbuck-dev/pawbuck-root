using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ICareNudgeService
{
    Task<IReadOnlyList<CareNudgeDto>> GetNudgesForPetAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CareNudgeDto>> GetNudgesForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
