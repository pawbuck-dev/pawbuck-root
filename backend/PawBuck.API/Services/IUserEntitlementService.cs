using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Reads <c>public.user_entitlements</c> and usage counters via Npgsql.
/// </summary>
public interface IUserEntitlementService
{
    /// <summary>
    /// True when the user has individual or family plan and subscription is not expired (or founding).
    /// </summary>
    Task<bool> HasActivePremiumAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<string> GetActivePlanAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<bool> MeetsMinimumPlanAsync(Guid userId, string minimumPlan, CancellationToken cancellationToken = default);

    Task<bool> IsFoundingMemberAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<SubscriptionStatusResponse?> GetStatusAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<int> IncrementMiloConversationUsageAsync(Guid userId, CancellationToken cancellationToken = default);

    Task AssertMiloConversationAllowedAsync(Guid userId, CancellationToken cancellationToken = default);

    Task AssertAiJournalAllowedAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<int> IncrementAiJournalUsageAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<FoundingMemberStatsResponse?> GetFoundingMemberStatsAsync(CancellationToken cancellationToken = default);

    Task<SubscriptionPlanBreakdownResponse?> GetPlanBreakdownAsync(CancellationToken cancellationToken = default);
}
