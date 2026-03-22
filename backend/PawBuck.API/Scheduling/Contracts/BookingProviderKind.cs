namespace PawBuck.API.Scheduling.Contracts;

/// <summary>
/// Third-party scheduling backend integrated via PawBuck.API adapters.
/// </summary>
public enum BookingProviderKind
{
    Unknown = 0,
    Vetstoria = 1,
    EazyVet = 2,
    /// <summary>Deterministic demo slots + booking for dev and clinics without a live vendor.</summary>
    PawBuckDemo = 3,
}
