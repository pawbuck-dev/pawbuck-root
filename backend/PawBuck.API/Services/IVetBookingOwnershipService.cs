namespace PawBuck.API.Services;

/// <summary>
/// Verifies the authenticated user may act on a <c>vet_bookings</c> row (cancel, etc.).
/// </summary>
public interface IVetBookingOwnershipService
{
    /// <summary>
    /// Returns true when <paramref name="userId"/> owns the booking or has pet access via family grant.
    /// </summary>
    Task<bool> CanActOnBookingAsync(
        Guid userId,
        Guid clinicId,
        Guid? appointmentId,
        string? externalAppointmentId,
        CancellationToken cancellationToken = default);
}
