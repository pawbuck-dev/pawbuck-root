using System.Text.Json;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Configuration;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class RetentionService : IRetentionService
{
    private readonly IOptions<SupabaseOptions> _supabase;
    private readonly IOptions<RetentionOptions> _options;
    private readonly ILogger<RetentionService> _logger;

    public RetentionService(
        IOptions<SupabaseOptions> supabase,
        IOptions<RetentionOptions> options,
        ILogger<RetentionService> logger)
    {
        _supabase = supabase;
        _options = options;
        _logger = logger;
    }

    public async Task RunAllJobsAsync(CancellationToken cancellationToken)
    {
        var opts = _options.Value;
        await RunJobAsync("walk_gps_minimize", async conn =>
        {
            await using var cmd = new NpgsqlCommand(
                """
                UPDATE public.walk_sessions
                SET points = NULL, points_pruned_at = timezone('utc', now())
                WHERE points IS NOT NULL
                  AND points_pruned_at IS NULL
                  AND started_at < timezone('utc', now()) - (@days || ' days')::interval
                """,
                conn);
            cmd.Parameters.AddWithValue("days", opts.WalkGpsDays);
            return await cmd.ExecuteNonQueryAsync(cancellationToken);
        }, cancellationToken);

        await RunJobAsync("processed_emails_ttl", async conn =>
        {
            await using var cmd = new NpgsqlCommand(
                """
                DELETE FROM public.processed_emails
                WHERE COALESCE(completed_at, started_at, timezone('utc', now()))
                  < timezone('utc', now()) - (@days || ' days')::interval
                """,
                conn);
            cmd.Parameters.AddWithValue("days", opts.ProcessedEmailsDays);
            return await cmd.ExecuteNonQueryAsync(cancellationToken);
        }, cancellationToken);

        await RunJobAsync("milo_journal_turns_ttl", async conn =>
        {
            await using var cmd = new NpgsqlCommand(
                """
                DELETE FROM public.milo_journal_message_feedback f
                USING public.milo_journal_chat_turns t
                WHERE f.turn_id = t.id
                  AND t.created_at < timezone('utc', now()) - (@months || ' months')::interval
                """,
                conn);
            cmd.Parameters.AddWithValue("months", opts.MiloJournalTurnsMonths);
            await cmd.ExecuteNonQueryAsync(cancellationToken);

            await using var cmd2 = new NpgsqlCommand(
                """
                DELETE FROM public.milo_journal_chat_turns
                WHERE created_at < timezone('utc', now()) - (@months || ' months')::interval
                """,
                conn);
            cmd2.Parameters.AddWithValue("months", opts.MiloJournalTurnsMonths);
            return await cmd2.ExecuteNonQueryAsync(cancellationToken);
        }, cancellationToken);

        await RunJobAsync("analytics_events_ttl", async conn =>
        {
            await using var cmd = new NpgsqlCommand(
                """
                DELETE FROM public.analytics_events
                WHERE created_at < timezone('utc', now()) - (@months || ' months')::interval
                """,
                conn);
            cmd.Parameters.AddWithValue("months", opts.AnalyticsEventsMonths);
            return await cmd.ExecuteNonQueryAsync(cancellationToken);
        }, cancellationToken);

        await RunJobAsync("export_files_ttl", async conn =>
        {
            await using var cmd = new NpgsqlCommand(
                """
                UPDATE public.data_export_requests
                SET status = 'expired', updated_at = timezone('utc', now())
                WHERE status = 'ready'
                  AND expires_at IS NOT NULL
                  AND expires_at < timezone('utc', now())
                """,
                conn);
            return await cmd.ExecuteNonQueryAsync(cancellationToken);
        }, cancellationToken);

        await RunJobAsync("deletion_log_ttl", async conn =>
        {
            await using var cmd = new NpgsqlCommand(
                """
                DELETE FROM public.account_deletion_log
                WHERE completed_at < timezone('utc', now()) - (@months || ' months')::interval
                """,
                conn);
            cmd.Parameters.AddWithValue("months", opts.DeletionLogMonths);
            return await cmd.ExecuteNonQueryAsync(cancellationToken);
        }, cancellationToken);

        await RunJobAsync("retention_job_runs_ttl", async conn =>
        {
            await using var cmd = new NpgsqlCommand(
                """
                DELETE FROM public.retention_job_runs
                WHERE ran_at < timezone('utc', now()) - (@days || ' days')::interval
                """,
                conn);
            cmd.Parameters.AddWithValue("days", opts.RetentionJobRunsDays);
            return await cmd.ExecuteNonQueryAsync(cancellationToken);
        }, cancellationToken);
    }

    public async Task<IReadOnlyList<RetentionJobRunRow>> GetRecentRunsAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var cs = RequireConnectionString();
        var rows = new List<RetentionJobRunRow>();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT id, job_name, ran_at, rows_affected, details::text
            FROM public.retention_job_runs
            ORDER BY ran_at DESC
            LIMIT @limit
            """,
            conn);
        cmd.Parameters.AddWithValue("limit", Math.Clamp(limit, 1, 200));

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new RetentionJobRunRow(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetFieldValue<DateTimeOffset>(2),
                reader.GetInt64(3),
                reader.IsDBNull(4) ? null : reader.GetString(4)));
        }

        return rows;
    }

    private async Task RunJobAsync(
        string jobName,
        Func<NpgsqlConnection, Task<int>> execute,
        CancellationToken cancellationToken)
    {
        try
        {
            var cs = RequireConnectionString();
            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync(cancellationToken);
            var affected = await execute(conn);

            await using var log = new NpgsqlCommand(
                """
                INSERT INTO public.retention_job_runs (job_name, rows_affected)
                VALUES (@name, @rows)
                """,
                conn);
            log.Parameters.AddWithValue("name", jobName);
            log.Parameters.AddWithValue("rows", (long)affected);
            await log.ExecuteNonQueryAsync(cancellationToken);

            if (affected > 0)
                _logger.LogInformation("Retention job {Job} affected {Rows} row(s)", jobName, affected);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Retention job {Job} failed", jobName);
            try
            {
                var cs = RequireConnectionString();
                await using var conn = new NpgsqlConnection(cs);
                await conn.OpenAsync(cancellationToken);
                await using var log = new NpgsqlCommand(
                    """
                    INSERT INTO public.retention_job_runs (job_name, rows_affected, details)
                    VALUES (@name, 0, @details::jsonb)
                    """,
                    conn);
                log.Parameters.AddWithValue("name", jobName);
                log.Parameters.AddWithValue("details", JsonSerializer.Serialize(new { error = ex.Message }));
                await log.ExecuteNonQueryAsync(cancellationToken);
            }
            catch (Exception logEx)
            {
                _logger.LogError(logEx, "Failed to log retention job failure for {Job}", jobName);
            }
        }
    }

    private string RequireConnectionString()
    {
        var cs = _supabase.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Supabase ConnectionString is required for retention jobs.");
        return cs;
    }
}
