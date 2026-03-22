using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling.Abstractions;

/// <summary>
/// Per-request context for vendor adapters (credentials loaded server-side; never exposed to clients).
/// Populated from Supabase clinic integration row in production.
/// </summary>
public sealed class SchedulingAdapterContext
{
    public Guid ClinicId { get; init; }

    public BookingProviderKind ProviderKind { get; init; }

    /// <summary>Vendor clinic/location identifier.</summary>
    public string? ExternalClinicId { get; init; }

    /// <summary>Optional opaque integration settings (tenant ids, base URLs) — not secrets.</summary>
    public IReadOnlyDictionary<string, string>? IntegrationSettings { get; init; }
}
