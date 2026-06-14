using System.Diagnostics;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Configuration;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Services;

public interface IOpsProbeService
{
    Task<(bool Ok, int? LatencyMs, string? Error)> PingPostgresAsync(CancellationToken cancellationToken = default);

    Task RunAllProbesAsync(string source, CancellationToken cancellationToken = default);

    Task RecordProbeAsync(
        string probeName,
        string source,
        bool ok,
        int? latencyMs,
        string? errorSummary,
        CancellationToken cancellationToken = default);

    Task<SupportOpsHealthResponse> GetLiveHealthAsync(CancellationToken cancellationToken = default);

    Task<SupportOpsAvailabilityResponse> GetAvailabilityAsync(
        int days,
        CancellationToken cancellationToken = default);
}

public sealed class OpsProbeService : IOpsProbeService
{
    public const string ProbePostgres = "postgres";
    public const string ProbeMailPipeline = "mail_pipeline";
    public const string ProbeJournalCheckIn = "journal_checkin";
    public const string ProbeOverall = "overall";
    public const string ProbeApiHealthExternal = "api_health_external";

    private static readonly IReadOnlyDictionary<string, string> ProbeLabels = new Dictionary<string, string>(
        StringComparer.OrdinalIgnoreCase)
    {
        [ProbePostgres] = "Postgres",
        [ProbeMailPipeline] = "Mail pipeline",
        [ProbeJournalCheckIn] = "Journal check-in",
        [ProbeOverall] = "Overall",
        [ProbeApiHealthExternal] = "API health (external)",
    };

    private readonly IOptions<SupabaseOptions> _supabaseOptions;
    private readonly IOptions<MiloOptions> _miloOptions;
    private readonly IOptions<GeminiOptions> _geminiOptions;
    private readonly IOptions<OpsProbeOptions> _probeOptions;
    private readonly IMiloReasoningService _reasoning;
    private readonly IMiloPetFactsService _petFacts;
    private readonly ISupportDirectoryService _directory;
    private readonly ILogger<OpsProbeService> _logger;

    public OpsProbeService(
        IOptions<SupabaseOptions> supabaseOptions,
        IOptions<MiloOptions> miloOptions,
        IOptions<GeminiOptions> geminiOptions,
        IOptions<OpsProbeOptions> probeOptions,
        IMiloReasoningService reasoning,
        IMiloPetFactsService petFacts,
        ISupportDirectoryService directory,
        ILogger<OpsProbeService> logger)
    {
        _supabaseOptions = supabaseOptions;
        _miloOptions = miloOptions;
        _geminiOptions = geminiOptions;
        _probeOptions = probeOptions;
        _reasoning = reasoning;
        _petFacts = petFacts;
        _directory = directory;
        _logger = logger;
    }

    public async Task<(bool Ok, int? LatencyMs, string? Error)> PingPostgresAsync(
        CancellationToken cancellationToken = default)
    {
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return (false, null, "Supabase:ConnectionString not configured");

        var sw = Stopwatch.StartNew();
        try
        {
            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync(cancellationToken);
            await using var cmd = new NpgsqlCommand("SELECT 1", conn);
            await cmd.ExecuteScalarAsync(cancellationToken);
            sw.Stop();
            return (true, (int)sw.ElapsedMilliseconds, null);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Ops probe Postgres ping failed");
            return (false, (int)sw.ElapsedMilliseconds, TruncateError(ex.Message));
        }
    }

    public async Task RunAllProbesAsync(string source, CancellationToken cancellationToken = default)
    {
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
        {
            _logger.LogWarning("Ops probes skipped: database not configured");
            return;
        }

        var probeResults = new List<(string Name, bool Ok, int? LatencyMs, string? Error)>();

        var pg = await ProbePostgresInternalAsync(cancellationToken);
        probeResults.Add((ProbePostgres, pg.Ok, pg.LatencyMs, pg.Error));
        await SaveProbeRowAsync(ProbePostgres, source, pg.Ok, pg.LatencyMs, pg.Error, cancellationToken);

        var mail = await ProbeMailPipelineAsync(cancellationToken);
        probeResults.Add((ProbeMailPipeline, mail.Ok, mail.LatencyMs, mail.Error));
        await SaveProbeRowAsync(ProbeMailPipeline, source, mail.Ok, mail.LatencyMs, mail.Error, cancellationToken);

        var journal = await ProbeJournalCheckInAsync(cancellationToken);
        probeResults.Add((ProbeJournalCheckIn, journal.Ok, journal.LatencyMs, journal.Error));
        await SaveProbeRowAsync(
            ProbeJournalCheckIn,
            source,
            journal.Ok,
            journal.LatencyMs,
            journal.Error,
            cancellationToken);

        var overallOk = probeResults.All(p => p.Ok);
        var overallLatency = probeResults.Where(p => p.LatencyMs.HasValue).Select(p => p.LatencyMs!.Value).DefaultIfEmpty(0)
            .Max();
        var overallError = overallOk
            ? null
            : string.Join("; ", probeResults.Where(p => !p.Ok).Select(p => $"{p.Name}: {p.Error ?? "failed"}"));
        await SaveProbeRowAsync(
            ProbeOverall,
            source,
            overallOk,
            overallLatency > 0 ? overallLatency : null,
            overallError,
            cancellationToken);

        await PruneOldRowsAsync(cancellationToken);
    }

    public Task RecordProbeAsync(
        string probeName,
        string source,
        bool ok,
        int? latencyMs,
        string? errorSummary,
        CancellationToken cancellationToken = default) =>
        SaveProbeRowAsync(probeName, source, ok, latencyMs, errorSummary, cancellationToken);

    public async Task<SupportOpsHealthResponse> GetLiveHealthAsync(CancellationToken cancellationToken = default)
    {
        var checkedAt = DateTimeOffset.UtcNow;
        var config = ApiHealthStatusBuilder.BuildAdminOpsHealth(
            _miloOptions.Value,
            _supabaseOptions.Value,
            _geminiOptions.Value);

        var (pgOk, pgLatency, pgError) = await PingPostgresAsync(cancellationToken);
        var checks = config.Checks.ToList();
        checks.Add(new SupportOpsHealthCheckDto
        {
            Id = "postgresLive",
            Label = "Postgres live ping",
            Ok = pgOk,
            Hint = pgOk
                ? $"Round-trip {pgLatency} ms."
                : pgError ?? "Database ping failed.",
        });

        var latestProbes = await LoadLatestProbeSnapshotsAsync(cancellationToken);
        var allReady = checks.All(c => c.Ok);

        return new SupportOpsHealthResponse
        {
            AllReady = allReady,
            Checks = checks,
            CheckedAt = checkedAt,
            PostgresLatencyMs = pgLatency,
            LatestProbes = latestProbes,
        };
    }

    public async Task<SupportOpsAvailabilityResponse> GetAvailabilityAsync(
        int days,
        CancellationToken cancellationToken = default)
    {
        days = Math.Clamp(days, 1, 30);
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured for ops availability.");

        var asOf = DateTimeOffset.UtcNow;
        var from7 = asOf.AddDays(-7);
        var from24 = asOf.AddHours(-24);
        var fromDays = asOf.AddDays(-days);

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        var probes = await LoadProbeAvailabilityAsync(conn, from24, from7, cancellationToken);
        var daily = await LoadDailyOverallAsync(conn, fromDays, cancellationToken);

        var overall24 = probes.FirstOrDefault(p => p.ProbeName == ProbeOverall)?.Availability24h ?? 0;
        var overall7 = probes.FirstOrDefault(p => p.ProbeName == ProbeOverall)?.Availability7d ?? 0;

        return new SupportOpsAvailabilityResponse
        {
            AsOf = asOf,
            OverallAvailability24h = overall24,
            OverallAvailability7d = overall7,
            Probes = probes,
            DailyOverall = daily,
        };
    }

    private async Task<(bool Ok, int? LatencyMs, string? Error)> ProbePostgresInternalAsync(
        CancellationToken cancellationToken) =>
        await PingPostgresAsync(cancellationToken);

    private async Task<(bool Ok, int? LatencyMs, string? Error)> ProbeMailPipelineAsync(
        CancellationToken cancellationToken)
    {
        var supabase = _supabaseOptions.Value;
        if (string.IsNullOrWhiteSpace(supabase.Url) || string.IsNullOrWhiteSpace(supabase.ServiceRoleKey))
        {
            return (false, null, "Mail resolve requires Supabase URL + service role key");
        }

        var cs = supabase.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return (false, null, "Supabase:ConnectionString not configured");

        var sw = Stopwatch.StartNew();
        try
        {
            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync(cancellationToken);
            await using var cmd = new NpgsqlCommand(
                "SELECT 1 FROM public.processed_emails LIMIT 1",
                conn);
            await cmd.ExecuteScalarAsync(cancellationToken);
            sw.Stop();
            return (true, (int)sw.ElapsedMilliseconds, null);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Ops probe mail_pipeline failed");
            return (false, (int)sw.ElapsedMilliseconds, TruncateError(ex.Message));
        }
    }

    private async Task<(bool Ok, int? LatencyMs, string? Error)> ProbeJournalCheckInAsync(
        CancellationToken cancellationToken)
    {
        var opts = _probeOptions.Value;
        var userId = opts.JournalCheckInUserId;
        var petId = opts.JournalCheckInPetId;

        if (!userId.HasValue || !petId.HasValue || userId.Value == Guid.Empty || petId.Value == Guid.Empty)
            return await ProbeJournalSchemaReadyAsync(cancellationToken);

        var sw = Stopwatch.StartNew();
        try
        {
            if (!await _petFacts.VerifyPetAccessAsync(userId.Value, petId.Value, cancellationToken))
                return (false, null, "Configured probe pet is not accessible for probe user");

            var pet = await _directory.GetPetByIdAsync(petId.Value, cancellationToken);
            if (pet == null)
                return (false, null, "Configured probe pet not found");

            var request = new MiloChatRequest
            {
                Message = "start",
                JournalMode = true,
                JournalAction = "start_checkin",
                Pet = new MiloPetContextDto
                {
                    Id = pet.Id.ToString("D"),
                    Name = pet.Name,
                    AnimalType = pet.AnimalType,
                    Breed = pet.Breed,
                    DateOfBirth = pet.DateOfBirth?.ToString("yyyy-MM-dd"),
                    Sex = pet.Sex,
                },
            };

            var response = await _reasoning.ChatAsync(userId.Value, request, cancellationToken);
            sw.Stop();

            if (string.IsNullOrWhiteSpace(response.Answer))
                return (false, (int)sw.ElapsedMilliseconds, "Journal start_checkin returned empty answer");

            if (response.SuggestedReplies == null || response.SuggestedReplies.Count == 0)
            {
                return (
                    false,
                    (int)sw.ElapsedMilliseconds,
                    "Journal start_checkin returned no topic chips");
            }

            return (true, (int)sw.ElapsedMilliseconds, null);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Ops probe journal_checkin failed");
            return (false, (int)sw.ElapsedMilliseconds, TruncateError(ex.Message));
        }
    }

    private async Task<(bool Ok, int? LatencyMs, string? Error)> ProbeJournalSchemaReadyAsync(
        CancellationToken cancellationToken)
    {
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return (false, null, "Supabase:ConnectionString not configured");

        var sw = Stopwatch.StartNew();
        try
        {
            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync(cancellationToken);
            const string sql = """
                SELECT
                  to_regclass('public.journal_interview_sessions') IS NOT NULL
                  AND to_regclass('public.pet_journal_entries') IS NOT NULL
                """;
            await using var cmd = new NpgsqlCommand(sql, conn);
            var ready = (bool)(await cmd.ExecuteScalarAsync(cancellationToken) ?? false);
            sw.Stop();
            return ready
                ? (true, (int)sw.ElapsedMilliseconds, "Schema ready (set OpsProbe:JournalCheckInUserId/PetId for full smoke)")
                : (false, (int)sw.ElapsedMilliseconds, "Journal tables missing — apply Supabase migrations");
        }
        catch (Exception ex)
        {
            sw.Stop();
            return (false, (int)sw.ElapsedMilliseconds, TruncateError(ex.Message));
        }
    }

    private async Task SaveProbeRowAsync(
        string probeName,
        string source,
        bool ok,
        int? latencyMs,
        string? errorSummary,
        CancellationToken cancellationToken)
    {
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return;

        var normalizedSource = NormalizeSource(source);
        var normalizedName = probeName.Trim();
        if (normalizedName.Length == 0)
            return;

        try
        {
            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync(cancellationToken);
            const string sql = """
                INSERT INTO public.ops_probe_results
                  (probe_name, source, ok, latency_ms, error_summary)
                VALUES
                  (@name, @source, @ok, @latency, @error)
                """;
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("name", normalizedName);
            cmd.Parameters.AddWithValue("source", normalizedSource);
            cmd.Parameters.AddWithValue("ok", ok);
            cmd.Parameters.AddWithValue("latency", (object?)latencyMs ?? DBNull.Value);
            cmd.Parameters.AddWithValue("error", (object?)TruncateError(errorSummary) ?? DBNull.Value);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist ops probe row {ProbeName}", normalizedName);
        }
    }

    private async Task PruneOldRowsAsync(CancellationToken cancellationToken)
    {
        var retention = Math.Clamp(_probeOptions.Value.RetentionDays, 7, 90);
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return;

        try
        {
            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync(cancellationToken);
            await using var cmd = new NpgsqlCommand(
                "DELETE FROM public.ops_probe_results WHERE created_at < timezone('utc', now()) - make_interval(days => @days)",
                conn);
            cmd.Parameters.AddWithValue("days", retention);
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Ops probe retention prune failed");
        }
    }

    private async Task<IReadOnlyList<SupportOpsProbeSnapshotDto>> LoadLatestProbeSnapshotsAsync(
        CancellationToken cancellationToken)
    {
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return Array.Empty<SupportOpsProbeSnapshotDto>();

        try
        {
            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync(cancellationToken);
            const string sql = """
                SELECT DISTINCT ON (probe_name)
                  probe_name, ok, latency_ms, error_summary, source, created_at
                FROM public.ops_probe_results
                ORDER BY probe_name, created_at DESC
                """;
            await using var cmd = new NpgsqlCommand(sql, conn);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            var list = new List<SupportOpsProbeSnapshotDto>();
            while (await reader.ReadAsync(cancellationToken))
            {
                list.Add(new SupportOpsProbeSnapshotDto
                {
                    ProbeName = reader.GetString(0),
                    Ok = reader.GetBoolean(1),
                    LatencyMs = reader.IsDBNull(2) ? null : reader.GetInt32(2),
                    ErrorSummary = reader.IsDBNull(3) ? null : reader.GetString(3),
                    Source = reader.GetString(4),
                    CheckedAt = reader.GetDateTime(5).ToUniversalTime(),
                });
            }

            return list;
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UndefinedTable)
        {
            return Array.Empty<SupportOpsProbeSnapshotDto>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load latest ops probe snapshots");
            return Array.Empty<SupportOpsProbeSnapshotDto>();
        }
    }

    private async Task<IReadOnlyList<SupportProbeAvailabilityDto>> LoadProbeAvailabilityAsync(
        NpgsqlConnection conn,
        DateTimeOffset from24,
        DateTimeOffset from7,
        CancellationToken cancellationToken)
    {
        const string sql = """
            WITH stats AS (
              SELECT
                probe_name,
                COUNT(*) FILTER (WHERE created_at >= @from24 AND ok)::numeric AS ok24,
                COUNT(*) FILTER (WHERE created_at >= @from24)::numeric AS total24,
                COUNT(*) FILTER (WHERE created_at >= @from7 AND ok)::numeric AS ok7,
                COUNT(*) FILTER (WHERE created_at >= @from7)::numeric AS total7
              FROM public.ops_probe_results
              GROUP BY probe_name
            ),
            latest AS (
              SELECT DISTINCT ON (probe_name)
                probe_name, ok, error_summary
              FROM public.ops_probe_results
              ORDER BY probe_name, created_at DESC
            )
            SELECT
              s.probe_name,
              s.ok24, s.total24,
              s.ok7, s.total7,
              l.ok, l.error_summary
            FROM stats s
            LEFT JOIN latest l ON l.probe_name = s.probe_name
            ORDER BY s.probe_name
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("from24", from24.UtcDateTime);
        cmd.Parameters.AddWithValue("from7", from7.UtcDateTime);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var list = new List<SupportProbeAvailabilityDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var name = reader.GetString(0);
            var ok24 = reader.GetDecimal(1);
            var total24 = reader.GetDecimal(2);
            var ok7 = reader.GetDecimal(3);
            var total7 = reader.GetDecimal(4);

            list.Add(new SupportProbeAvailabilityDto
            {
                ProbeName = name,
                Label = ProbeLabels.TryGetValue(name, out var label) ? label : name,
                Availability24h = Percent(ok24, total24),
                Availability7d = Percent(ok7, total7),
                Samples24h = (int)total24,
                Samples7d = (int)total7,
                LastOk = reader.IsDBNull(5) ? null : reader.GetBoolean(5),
                LastErrorSummary = reader.IsDBNull(6) ? null : reader.GetString(6),
            });
        }

        return list;
    }

    private static async Task<IReadOnlyList<SupportDailyAvailabilityDto>> LoadDailyOverallAsync(
        NpgsqlConnection conn,
        DateTimeOffset fromDays,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
              (created_at AT TIME ZONE 'UTC')::date AS day,
              COUNT(*) FILTER (WHERE ok)::numeric AS ok_count,
              COUNT(*)::numeric AS total
            FROM public.ops_probe_results
            WHERE probe_name = @overall
              AND created_at >= @from
            GROUP BY day
            ORDER BY day
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("overall", ProbeOverall);
        cmd.Parameters.AddWithValue("from", fromDays.UtcDateTime);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var list = new List<SupportDailyAvailabilityDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var day = reader.GetDateTime(0);
            var ok = reader.GetDecimal(1);
            var total = reader.GetDecimal(2);
            list.Add(new SupportDailyAvailabilityDto
            {
                Date = day.ToString("yyyy-MM-dd"),
                AvailabilityPct = Percent(ok, total),
                Samples = (int)total,
            });
        }

        return list;
    }

    private static decimal Percent(decimal ok, decimal total) =>
        total <= 0 ? 0 : Math.Round(ok * 100m / total, 1);

    private static string NormalizeSource(string source)
    {
        var s = (source ?? "internal").Trim().ToLowerInvariant();
        return s switch
        {
            "external_github" => "external_github",
            "external" => "external",
            _ => "internal",
        };
    }

    private static string? TruncateError(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return null;
        var t = message.Trim();
        return t.Length <= 240 ? t : t[..237] + "…";
    }
}
