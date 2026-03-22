using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling;

/// <summary>
/// Maps PawBuck clinics to scheduling providers until Supabase-backed config is wired.
/// </summary>
public sealed class SchedulingRoutingOptions
{
    public const string SectionName = "Scheduling";

    /// <summary>Per-clinic routing entries.</summary>
    public List<ClinicSchedulingRouteEntry> Clinics { get; set; } = new();
}

public sealed class ClinicSchedulingRouteEntry
{
    public Guid ClinicId { get; set; }
    public BookingProviderKind Provider { get; set; }
    public string? ExternalClinicId { get; set; }
    public Dictionary<string, string>? Settings { get; set; }
}
