namespace PawBuck.API.Scheduling.Contracts;

/// <summary>
/// PawBuck service line for booking. Start with veterinary; extend to grooming, boarding, etc.
/// </summary>
public enum BookingServiceType
{
    Veterinary = 0,
    Grooming = 1,
    Boarding = 2,
    Other = 99,
}
