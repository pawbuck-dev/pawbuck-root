using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling.Abstractions;

/// <summary>
/// Plug-and-play contract for a scheduling vendor (Vetstoria, EazyVet, future providers).
/// Implementations live only under Scheduling/Vendors/*.
/// </summary>
public interface ISchedulingVendorAdapter
{
    BookingProviderKind ProviderKind { get; }

    Task<SchedulingResult<IReadOnlyList<NormalizedSlot>>> GetAvailabilityAsync(
        AvailabilityQuery query,
        SchedulingAdapterContext context,
        CancellationToken cancellationToken = default);

    Task<SchedulingResult<NormalizedAppointment>> BookAsync(
        BookAppointmentCommand command,
        SchedulingAdapterContext context,
        CancellationToken cancellationToken = default);

    Task<SchedulingResult<object?>> CancelAsync(
        CancelAppointmentCommand command,
        SchedulingAdapterContext context,
        CancellationToken cancellationToken = default);
}
