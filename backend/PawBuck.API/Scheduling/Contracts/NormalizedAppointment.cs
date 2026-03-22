namespace PawBuck.API.Scheduling.Contracts;

/// <summary>
/// Vendor-agnostic booked appointment representation.
/// </summary>
public sealed class NormalizedAppointment
{
    /// <summary>PawBuck appointment id (when persisted).</summary>
    public Guid? Id { get; set; }

    /// <summary>Vendor appointment id.</summary>
    public string ExternalAppointmentId { get; set; } = string.Empty;

    public DateTimeOffset StartUtc { get; set; }
    public DateTimeOffset EndUtc { get; set; }
    public BookingServiceType ServiceType { get; set; }
    public string? ExternalResourceId { get; set; }
    public string? Notes { get; set; }
}
