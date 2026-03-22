namespace PawBuck.API.Scheduling.Contracts;

/// <summary>
/// Normalized book command (idempotency key handled at orchestration layer).
/// </summary>
public sealed class BookAppointmentCommand
{
    public Guid ClinicId { get; set; }
    public BookingServiceType ServiceType { get; set; }

    public DateTimeOffset StartUtc { get; set; }
    public DateTimeOffset EndUtc { get; set; }

    public string? ExternalResourceId { get; set; }
    public string? SelectionToken { get; set; }

    /// <summary>End-user / pet owner reference in PawBuck.</summary>
    public Guid? UserId { get; set; }

    /// <summary>Pet id in PawBuck when applicable.</summary>
    public Guid? PetId { get; set; }

    public string? Notes { get; set; }

    /// <summary>Client-supplied idempotency key (also stored server-side).</summary>
    public string? IdempotencyKey { get; set; }
}
