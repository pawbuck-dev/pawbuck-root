using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling.Abstractions;

/// <summary>
/// Resolves which vendor integration applies to a PawBuck clinic (Supabase in production).
/// </summary>
public interface IClinicSchedulingConfigProvider
{
    /// <summary>Returns null if clinic has no scheduling integration configured.</summary>
    Task<ClinicSchedulingConfig?> GetAsync(Guid clinicId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Clinic-level scheduling integration metadata (no secrets).
/// </summary>
public sealed class ClinicSchedulingConfig
{
    public Guid ClinicId { get; init; }
    public BookingProviderKind ProviderKind { get; init; }
    public string? ExternalClinicId { get; init; }
    public IReadOnlyDictionary<string, string>? IntegrationSettings { get; init; }
}
