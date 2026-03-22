namespace PawBuck.API.Scheduling.Contracts;

/// <summary>
/// Normalized availability query (maps to vendor-specific APIs inside adapters).
/// </summary>
public sealed class AvailabilityQuery
{
    public Guid ClinicId { get; set; }
    public BookingServiceType ServiceType { get; set; }

    /// <summary>Search window start (UTC).</summary>
    public DateTimeOffset RangeStartUtc { get; set; }

    /// <summary>Search window end (UTC).</summary>
    public DateTimeOffset RangeEndUtc { get; set; }

    /// <summary>Optional: limit to one external resource id.</summary>
    public string? ExternalResourceId { get; set; }
}
