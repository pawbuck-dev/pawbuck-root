using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Configuration;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public class SupportQueuesService : ISupportQueuesService
{
    private readonly IOptions<SupabaseOptions> _supabaseOptions;
    private readonly IOptions<MiloOptions> _miloOptions;
    private readonly IOptions<GeminiOptions> _geminiOptions;
    private readonly ILogger<SupportQueuesService> _logger;

    public SupportQueuesService(
        IOptions<SupabaseOptions> supabaseOptions,
        IOptions<MiloOptions> miloOptions,
        IOptions<GeminiOptions> geminiOptions,
        ILogger<SupportQueuesService> logger)
    {
        _supabaseOptions = supabaseOptions;
        _miloOptions = miloOptions;
        _geminiOptions = geminiOptions;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<SupportQueuesSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
        {
            _logger.LogWarning("Supabase ConnectionString missing for queues summary");
            throw new InvalidOperationException("Database not configured for support queues summary.");
        }

        var asOf = DateTimeOffset.UtcNow;
        var from30 = asOf.AddDays(-30);

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        var reviewInboxOpen = await ScalarCountAsync(conn, ReviewInboxOpenCountSql, null, cancellationToken);
        var stuckProcessing = await ScalarCountAsync(conn, StuckProcessingCountSql, null, cancellationToken);

        var failuresParams = new List<(string Name, object? Value)>
        {
            ("from", from30),
            ("to", asOf),
        };
        var mailFailuresLast30 = await ScalarCountAsync(
            conn,
            MailFailuresLast30DaysSql,
            failuresParams,
            cancellationToken);

        var ops = ApiHealthStatusBuilder.BuildAdminOpsHealth(
            _miloOptions.Value,
            _supabaseOptions.Value,
            _geminiOptions.Value);
        var opsFailing = ops.Checks.Count(c => !c.Ok);

        return new SupportQueuesSummaryResponse
        {
            AsOf = asOf,
            ReviewInboxOpen = reviewInboxOpen,
            StuckProcessing = stuckProcessing,
            MailFailuresLast30Days = mailFailuresLast30,
            OpsChecksFailing = opsFailing,
            OpsAllReady = ops.AllReady,
        };
    }

    /// <summary>Same visibility as <see cref="SupportProcessedEmailsService.BuildListFilter"/> review-inbox mode (no date bounds).</summary>
    internal const string ReviewInboxOpenCountSql = """
        SELECT COUNT(*)::int
        FROM public.processed_emails pe
        WHERE (
          (pe.status = 'completed'
            AND COALESCE(pe.review_status, 'pending') NOT IN ('dismissed', 'resolved')
            AND (pe.success = false OR NULLIF(trim(pe.failure_reason), '') IS NOT NULL))
          OR pe.status = 'processing'
        )
        """;

    internal const string StuckProcessingCountSql = """
        SELECT COUNT(*)::int
        FROM public.processed_emails pe
        WHERE pe.status = 'processing'
          AND COALESCE(pe.review_status, 'pending') NOT IN ('dismissed', 'resolved')
        """;

    internal const string MailFailuresLast30DaysSql = """
        SELECT COUNT(*)::int
        FROM public.processed_emails pe
        WHERE pe.status = 'completed'
          AND pe.success = false
          AND pe.completed_at >= @from
          AND pe.completed_at < @to
        """;

    private static async Task<int> ScalarCountAsync(
        NpgsqlConnection conn,
        string sql,
        List<(string Name, object? Value)>? parameters,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(sql, conn);
        if (parameters is not null)
        {
            foreach (var (name, value) in parameters)
                cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
        }

        return Convert.ToInt32(await cmd.ExecuteScalarAsync(cancellationToken) ?? 0);
    }
}
