namespace PawBuck.API.Models;

public sealed class SubscriptionFeatureGateDto
{
    public required string FeatureKey { get; init; }
    public required bool RequiresPremium { get; init; }
    public required string MinimumPlan { get; init; }
    public required string Label { get; init; }
    public int SortOrder { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public sealed class SubscriptionFeatureGatesResponse
{
    public required IReadOnlyList<SubscriptionFeatureGateDto> Items { get; init; }
}

public sealed class PatchSubscriptionFeatureGateRequest
{
    public bool? RequiresPremium { get; init; }
    public string? MinimumPlan { get; init; }
}

public sealed class SubscriptionUsageDto
{
    public int MiloConversationsUsed { get; init; }
    public int AiJournalEntriesUsed { get; init; }
}

public sealed class SubscriptionLimitsDto
{
    public int? MaxPets { get; init; }
    public int? MaxDocuments { get; init; }
    public int MaxFamilyMembers { get; init; }
    public int? MaxMiloConversations { get; init; }
    public int? MaxAiJournalEntries { get; init; }
}

public sealed class SubscriptionStatusResponse
{
    public required string Plan { get; init; }
    public bool IsFoundingMember { get; init; }
    public string? ProductId { get; init; }
    public DateTimeOffset? ExpiresAt { get; init; }
    public required SubscriptionUsageDto Usage { get; init; }
    public required SubscriptionLimitsDto Limits { get; init; }
    public int? FoundingSpotsRemaining { get; init; }
    public int DocumentCount { get; init; }
}

public sealed class FoundingMemberStatsResponse
{
    public int PurchaseCount { get; init; }
    public int SpotsRemaining { get; init; }
    public int Cap { get; init; } = 500;
}

public sealed class SubscriptionPlanTierCountDto
{
    public required string Plan { get; init; }
    public int UserCount { get; init; }
    public int FoundingMembers { get; init; }
}

public sealed class SubscriptionPlanBreakdownResponse
{
    public int TotalUsers { get; init; }
    public int UsersWithoutEntitlementRow { get; init; }
    public int ExpiredPaidSubscriptions { get; init; }
    public int FoundingMembers { get; init; }
    public required IReadOnlyList<SubscriptionPlanTierCountDto> Tiers { get; init; }
    public DateTimeOffset AsOf { get; init; }
}
