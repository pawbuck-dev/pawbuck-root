using System.Text.Json;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;
using PawBuck.API.Scheduling.Abstractions;
using PawBuck.API.Scheduling.Contracts;
using PawBuck.API.Services;

namespace PawBuck.API.Scheduling;

/// <summary>
/// Loads <see cref="ClinicSchedulingConfig"/> rows from <c>public.clinic_scheduling_config</c>.
/// </summary>
public sealed class SupabaseClinicSchedulingConfigProvider : IClinicSchedulingConfigProvider
{
    private readonly IOptionsMonitor<SupabaseOptions> _supabase;
    private readonly ILogger<SupabaseClinicSchedulingConfigProvider> _logger;

    public SupabaseClinicSchedulingConfigProvider(
        IOptionsMonitor<SupabaseOptions> supabase,
        ILogger<SupabaseClinicSchedulingConfigProvider> logger)
    {
        _supabase = supabase;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ClinicSchedulingConfig?> GetAsync(Guid clinicId, CancellationToken cancellationToken = default)
    {
        var connectionString = _supabase.CurrentValue.ConnectionString;
        if (string.IsNullOrWhiteSpace(connectionString))
            return null;

        try
        {
            await using var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync(cancellationToken);

            await using var cmd = new NpgsqlCommand(
                """
                SELECT clinic_id, provider_kind, external_clinic_id, integration_settings
                FROM public.clinic_scheduling_config
                WHERE clinic_id = @id
                LIMIT 1
                """,
                conn);
            cmd.Parameters.AddWithValue("id", clinicId);

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return null;

            var providerText = reader.GetString(1);
            if (!Enum.TryParse<BookingProviderKind>(providerText, ignoreCase: true, out var kind) ||
                kind == BookingProviderKind.Unknown)
            {
                _logger.LogWarning("Unknown provider_kind {Provider} for clinic {ClinicId}", providerText, clinicId);
                return null;
            }

            var externalId = reader.IsDBNull(2) ? null : reader.GetString(2);
            IReadOnlyDictionary<string, string>? settings = null;
            if (!reader.IsDBNull(3))
            {
                var json = reader.GetString(3);
                if (!string.IsNullOrWhiteSpace(json) && json != "{}")
                {
                    var dict = JsonSerializer.Deserialize<Dictionary<string, string>>(json);
                    if (dict is { Count: > 0 })
                        settings = dict;
                }
            }

            return new ClinicSchedulingConfig
            {
                ClinicId = reader.GetGuid(0),
                ProviderKind = kind,
                ExternalClinicId = externalId,
                IntegrationSettings = settings
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read clinic_scheduling_config for {ClinicId}", clinicId);
            return null;
        }
    }
}
