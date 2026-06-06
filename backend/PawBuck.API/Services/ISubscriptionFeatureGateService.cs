using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ISubscriptionFeatureGateService
{
    /// <summary>
    /// All gates (from DB, cached).
    /// </summary>
    Task<IReadOnlyList<SubscriptionFeatureGateDto>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Whether this feature requires premium when the gate is enabled (reads cached row).
    /// </summary>
    /// <summary>
    /// Whether this feature requires premium when the gate is enabled (reads cached row).
    /// </summary>
    Task<bool> IsPremiumRequiredForFeatureAsync(string featureKey, CancellationToken cancellationToken = default);

    Task<string> GetMinimumPlanForFeatureAsync(string featureKey, CancellationToken cancellationToken = default);

    Task<bool> TryUpdateRequiresPremiumAsync(string featureKey, bool requiresPremium, CancellationToken cancellationToken = default);

    Task<bool> TryUpdateMinimumPlanAsync(string featureKey, string minimumPlan, CancellationToken cancellationToken = default);
}
