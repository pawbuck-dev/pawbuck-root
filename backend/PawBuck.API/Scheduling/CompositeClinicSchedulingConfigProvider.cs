using Microsoft.Extensions.Options;
using PawBuck.API.Scheduling.Abstractions;
using PawBuck.API.Services;

namespace PawBuck.API.Scheduling;

/// <summary>
/// When <see cref="SchedulingRoutingOptions.UseSupabaseClinicConfig"/> is true and
/// <see cref="SupabaseOptions.ConnectionString"/> is set, reads from Postgres first; otherwise falls back to
/// <see cref="ConfigurationClinicSchedulingConfigProvider"/>.
/// </summary>
public sealed class CompositeClinicSchedulingConfigProvider : IClinicSchedulingConfigProvider
{
    private readonly IOptionsMonitor<SchedulingRoutingOptions> _scheduling;
    private readonly IOptionsMonitor<SupabaseOptions> _supabase;
    private readonly SupabaseClinicSchedulingConfigProvider _database;
    private readonly ConfigurationClinicSchedulingConfigProvider _configuration;

    public CompositeClinicSchedulingConfigProvider(
        IOptionsMonitor<SchedulingRoutingOptions> scheduling,
        IOptionsMonitor<SupabaseOptions> supabase,
        SupabaseClinicSchedulingConfigProvider database,
        ConfigurationClinicSchedulingConfigProvider configuration)
    {
        _scheduling = scheduling;
        _supabase = supabase;
        _database = database;
        _configuration = configuration;
    }

    /// <inheritdoc />
    public async Task<ClinicSchedulingConfig?> GetAsync(Guid clinicId, CancellationToken cancellationToken = default)
    {
        var useDb = _scheduling.CurrentValue.UseSupabaseClinicConfig
                    && !string.IsNullOrWhiteSpace(_supabase.CurrentValue.ConnectionString);

        if (useDb)
        {
            var fromDb = await _database.GetAsync(clinicId, cancellationToken);
            if (fromDb != null)
                return fromDb;
        }

        return await _configuration.GetAsync(clinicId, cancellationToken);
    }
}
