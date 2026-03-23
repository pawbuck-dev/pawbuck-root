using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling;

/// <summary>Abstraction for appointment scheduling (test seam for <see cref="BookingsController"/>).</summary>
public interface ISchedulingBookingService
{
    Task<SchedulingResult<IReadOnlyList<NormalizedSlot>>> GetAvailabilityAsync(
        AvailabilityQuery query,
        CancellationToken cancellationToken = default);

    Task<SchedulingResult<NormalizedAppointment>> BookAsync(
        BookAppointmentCommand command,
        CancellationToken cancellationToken = default);

    Task<SchedulingResult<object?>> CancelAsync(
        CancelAppointmentCommand command,
        CancellationToken cancellationToken = default);
}
