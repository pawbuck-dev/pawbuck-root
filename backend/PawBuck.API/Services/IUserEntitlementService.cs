namespace PawBuck.API.Services;

/// <summary>
/// Reads <c>public.user_entitlements</c> via Npgsql (same as pet facts).
/// </summary>
public interface IUserEntitlementService
{
    /// <summary>
    /// True when the user has <c>plan = 'premium'</c> and subscription is not expired.
    /// </summary>
    Task<bool> HasActivePremiumAsync(Guid userId, CancellationToken cancellationToken = default);
}
