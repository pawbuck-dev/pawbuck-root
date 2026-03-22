namespace PawBuck.API.Scheduling.Contracts;

/// <summary>
/// Normalized cancel command.
/// </summary>
public sealed class CancelAppointmentCommand
{
    public Guid ClinicId { get; set; }

    /// <summary>PawBuck appointment id when known.</summary>
    public Guid? AppointmentId { get; set; }

    /// <summary>Vendor appointment id when known.</summary>
    public string? ExternalAppointmentId { get; set; }

    public string? Reason { get; set; }
}
