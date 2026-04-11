using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ISupportDirectoryService
{
    Task<IReadOnlyList<SupportUserRow>> SearchUsersByEmailAsync(string query, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SupportPetRow>> GetPetsForUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<SupportPetRow?> GetPetByIdAsync(Guid petId, CancellationToken cancellationToken = default);
}
