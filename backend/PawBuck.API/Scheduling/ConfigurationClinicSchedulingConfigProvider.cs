using Microsoft.Extensions.Options;
using PawBuck.API.Scheduling.Abstractions;
using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling;

/// <summary>
/// Resolves clinic scheduling config from <see cref="SchedulingRoutingOptions"/> (replace with Supabase repository later).
/// </summary>
public sealed class ConfigurationClinicSchedulingConfigProvider : IClinicSchedulingConfigProvider
{
    private readonly IOptionsMonitor<SchedulingRoutingOptions> _options;

    public ConfigurationClinicSchedulingConfigProvider(IOptionsMonitor<SchedulingRoutingOptions> options)
    {
        _options = options;
    }

    public Task<ClinicSchedulingConfig?> GetAsync(Guid clinicId, CancellationToken cancellationToken = default)
    {
        var entry = _options.CurrentValue.Clinics.FirstOrDefault(c => c.ClinicId == clinicId);
        if (entry == null || entry.Provider == BookingProviderKind.Unknown)
            return Task.FromResult<ClinicSchedulingConfig?>(null);

        IReadOnlyDictionary<string, string>? settings = entry.Settings != null
            ? entry.Settings
            : null;

        return Task.FromResult<ClinicSchedulingConfig?>(new ClinicSchedulingConfig
        {
            ClinicId = entry.ClinicId,
            ProviderKind = entry.Provider,
            ExternalClinicId = entry.ExternalClinicId,
            IntegrationSettings = settings
        });
    }
}
