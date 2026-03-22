namespace PawBuck.API.Scheduling.Contracts;

/// <summary>
/// Third-party scheduling backend integrated via PawBuck.API adapters.
/// </summary>
public enum BookingProviderKind
{
    Unknown = 0,
    Vetstoria = 1,
    EazyVet = 2,
}
