using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface IMiloReasoningService
{
    Task<MiloChatResponse> ChatAsync(Guid userId, MiloChatRequest request, CancellationToken cancellationToken = default);
}
