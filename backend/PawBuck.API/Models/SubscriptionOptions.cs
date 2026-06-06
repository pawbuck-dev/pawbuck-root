namespace PawBuck.API.Models;

/// <summary>
/// Subscription / entitlement gating for premium features (Milo, booking, etc.).
/// </summary>
public class SubscriptionOptions
{
    public const string SectionName = "Subscription";

    /// <summary>
    /// When true, legacy all-or-nothing Milo premium check (prefer conversation cap instead).
    /// </summary>
    public bool RequirePremiumForMilo { get; set; }

    /// <summary>
    /// When true, free users are limited to lifetime Milo conversation cap from subscription_limits.
    /// </summary>
    public bool EnforceMiloConversationCap { get; set; } = true;

    /// <summary>
    /// When true, free users are limited to lifetime AI journal entry cap from subscription_limits.
    /// </summary>
    public bool EnforceAiJournalCap { get; set; } = true;
}
