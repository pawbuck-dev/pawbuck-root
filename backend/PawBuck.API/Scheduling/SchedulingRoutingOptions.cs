using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling;

/// <summary>
/// Maps PawBuck clinics to scheduling providers until Supabase-backed config is wired.
/// </summary>
public sealed class SchedulingRoutingOptions
{
    public const string SectionName = "Scheduling";

    /// <summary>
    /// When true and Supabase Postgres connection string is configured, load clinic routing from
    /// <c>public.clinic_scheduling_config</c> before falling back to <see cref="Clinics"/>.
    /// </summary>
    public bool UseSupabaseClinicConfig { get; set; } = true;

    /// <summary>Per-clinic routing entries (fallback and local dev without DB seed).</summary>
    public List<ClinicSchedulingRouteEntry> Clinics { get; set; } = new();
}

public sealed class ClinicSchedulingRouteEntry
{
    public Guid ClinicId { get; set; }
    public BookingProviderKind Provider { get; set; }
    public string? ExternalClinicId { get; set; }
    public Dictionary<string, string>? Settings { get; set; }
}
