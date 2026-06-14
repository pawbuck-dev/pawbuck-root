namespace PawBuck.API;

/// <summary>
/// Canonical subscription plan values in <c>public.user_entitlements.plan</c>.
/// </summary>
public static class SubscriptionPlans
{
    public const string Free = "free";
    public const string Individual = "individual";
    public const string Family = "family";

    /// <summary>Legacy value migrated to Individual.</summary>
    public const string LegacyPremium = "premium";

    public static int Rank(string? plan) => plan switch
    {
        Family => 2,
        Individual or LegacyPremium => 1,
        _ => 0,
    };

    public static bool MeetsMinimum(string? activePlan, string minimumPlan) =>
        Rank(activePlan) >= Rank(minimumPlan);
}

/// <summary>Complimentary entitlements set from the admin support portal (not App Store / RevenueCat).</summary>
public static class AdminEntitlementGrant
{
    public const string ProductId = "admin_grant";
    public const string SubscriptionStatus = "ADMIN_GRANT";
    public const string RevokedSubscriptionStatus = "ADMIN_REVOKED";
}
