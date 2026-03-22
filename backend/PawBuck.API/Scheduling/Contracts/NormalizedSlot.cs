namespace PawBuck.API.Scheduling.Contracts;

/// <summary>
/// Vendor-agnostic bookable time window returned to clients.
/// </summary>
public sealed class NormalizedSlot
{
    /// <summary>Start in UTC (ISO-8601 in API JSON).</summary>
    public DateTimeOffset StartUtc { get; set; }

    /// <summary>End in UTC.</summary>
    public DateTimeOffset EndUtc { get; set; }

    /// <summary>Optional provider/staff identifier in vendor namespace.</summary>
    public string? ExternalResourceId { get; set; }

    /// <summary>Optional human-readable label (e.g. "Dr. Smith").</summary>
    public string? ResourceLabel { get; set; }

    /// <summary>Opaque token for book request if vendor requires it.</summary>
    public string? SelectionToken { get; set; }
}
