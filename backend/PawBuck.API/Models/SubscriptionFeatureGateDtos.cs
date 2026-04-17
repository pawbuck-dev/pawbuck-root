namespace PawBuck.API.Models;

public sealed class SubscriptionFeatureGateDto
{
    public required string FeatureKey { get; init; }
    public required bool RequiresPremium { get; init; }
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
    public required bool RequiresPremium { get; init; }
}
