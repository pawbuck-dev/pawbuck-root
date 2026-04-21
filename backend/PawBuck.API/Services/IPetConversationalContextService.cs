using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface IPetConversationalContextService
{
    /// <summary>
    /// Returns null when the pet is not found or not owned by <paramref name="userId"/>.
    /// Uses <paramref name="config"/> for window sizes and counts.
    /// </summary>
    Task<PetConversationalContextDto?> GetPetConversationalContextAsync(
        Guid userId,
        Guid petId,
        MiloJournalConfigSnapshot config,
        CancellationToken cancellationToken = default);
}
