namespace PawBuck.API.Models;

/// <summary>
/// Subscription / entitlement gating for premium features (Milo, booking, etc.).
/// </summary>
public class SubscriptionOptions
{
    public const string SectionName = "Subscription";

    /// <summary>
    /// When true, <c>POST /api/milo/chat</c> requires an active premium row in <c>public.user_entitlements</c>.
    /// Default false so local dev and pre-subscription deployments keep working.
    /// </summary>
    public bool RequirePremiumForMilo { get; set; }
}
