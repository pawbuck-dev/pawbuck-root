using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ISupportDirectoryService
{
    /// <summary>
    /// Lists users for support: <paramref name="segment"/> is <c>all</c> (auth.users), <c>withPets</c> (has ≥1 non-deleted pet),
    /// or <c>withHealth</c> (same definition as metrics “pet + health data”).
    /// </summary>
    Task<IReadOnlyList<SupportUserRow>> ListUsersAsync(string segment, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupportUserRow>> SearchUsersByEmailAsync(string query, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SupportPetRow>> GetPetsForUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<SupportPetRow?> GetPetByIdAsync(Guid petId, CancellationToken cancellationToken = default);

    Task<SupportUserDirectoryResponse> GetUserDirectoryAsync(
        string? query,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupportPetExplorerRow>> SearchPetsAsync(string query, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SupportHealthTimelineEvent>> GetUserHealthTimelineAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}
