using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public class SupportDocumentProcessingService : ISupportDocumentProcessingService
{
    private const int TopFailureReasonLimit = 20;

    private readonly IOptions<SupabaseOptions> _options;

    public SupportDocumentProcessingService(IOptions<SupabaseOptions> options)
    {
        _options = options;
    }

    private NpgsqlConnection CreateConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured");
        return new NpgsqlConnection(cs);
    }

    /// <inheritdoc />
    public async Task<SupportDocumentProcessingMetricsResponse> GetMetricsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default)
    {
        var toExclusive = to ?? DateTimeOffset.UtcNow;
        var fromInclusive = from ?? toExclusive.AddDays(-30);

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        var email = await LoadEmailMetricsAsync(conn, fromInclusive, toExclusive, cancellationToken);
        var vault = await LoadVaultMetricsAsync(conn, fromInclusive, toExclusive, cancellationToken);

        return new SupportDocumentProcessingMetricsResponse
        {
            From = fromInclusive,
            To = toExclusive,
            Email = email,
            Vault = vault,
        };
    }

    private static async Task<SupportEmailProcessingMetricsDto> LoadEmailMetricsAsync(
        NpgsqlConnection conn,
        DateTimeOffset fromInclusive,
        DateTimeOffset toExclusive,
        CancellationToken cancellationToken)
    {
        const string totalsSql = """
            SELECT
              COUNT(*) FILTER (WHERE pe.success = true)::int AS succeeded,
              COUNT(*) FILTER (WHERE pe.success = false)::int AS failed
            FROM public.processed_emails pe
            WHERE pe.status = 'completed'
              AND pe.completed_at >= @from
              AND pe.completed_at < @to
            """;

        int succeeded;
        int failed;
        await using (var cmd = new NpgsqlCommand(totalsSql, conn))
        {
            cmd.Parameters.AddWithValue("from", fromInclusive);
            cmd.Parameters.AddWithValue("to", toExclusive);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                throw new InvalidOperationException("Email totals query returned no row.");

            succeeded = reader.GetInt32(0);
            failed = reader.GetInt32(1);
        }

        var totalCompleted = succeeded + failed;
        var successRate = totalCompleted > 0 ? Math.Round(succeeded * 100.0 / totalCompleted, 1) : 0;

        const string reviewInboxSql = """
            SELECT COUNT(*)::int
            FROM public.processed_emails pe
            WHERE pe.status = 'completed'
              AND COALESCE(pe.review_status, 'pending') NOT IN ('dismissed', 'resolved')
              AND (pe.success = false OR NULLIF(trim(pe.failure_reason), '') IS NOT NULL)
              AND pe.completed_at >= @from
              AND pe.completed_at < @to
            """;

        const string stuckSql = """
            SELECT COUNT(*)::int
            FROM public.processed_emails pe
            WHERE pe.status = 'processing'
              AND COALESCE(pe.review_status, 'pending') NOT IN ('dismissed', 'resolved')
              AND pe.started_at >= @from
              AND pe.started_at < @to
            """;

        int reviewInboxOpen;
        await using (var reviewCmd = new NpgsqlCommand(reviewInboxSql, conn))
        {
            reviewCmd.Parameters.AddWithValue("from", fromInclusive);
            reviewCmd.Parameters.AddWithValue("to", toExclusive);
            reviewInboxOpen = Convert.ToInt32(await reviewCmd.ExecuteScalarAsync(cancellationToken) ?? 0);
        }

        int stuckProcessing;
        await using (var stuckCmd = new NpgsqlCommand(stuckSql, conn))
        {
            stuckCmd.Parameters.AddWithValue("from", fromInclusive);
            stuckCmd.Parameters.AddWithValue("to", toExclusive);
            stuckProcessing = Convert.ToInt32(await stuckCmd.ExecuteScalarAsync(cancellationToken) ?? 0);
        }

        var dailyVolume = await LoadDailyVolumeAsync(conn, fromInclusive, toExclusive, cancellationToken);
        var byFailureCategory = await LoadFailureCategoriesAsync(
            conn, fromInclusive, toExclusive, failed, cancellationToken);
        var topFailureReasons = await LoadTopFailureReasonsAsync(
            conn, fromInclusive, toExclusive, cancellationToken);
        var byDocumentType = await LoadDocumentTypeOutcomesAsync(
            conn, fromInclusive, toExclusive, cancellationToken);
        var dailyFailuresByCategory = await LoadDailyFailuresByCategoryAsync(
            conn, fromInclusive, toExclusive, cancellationToken);
        var qualityTrend = await LoadQualityTrendAsync(
            conn, fromInclusive, toExclusive, successRate, failed, cancellationToken);

        return new SupportEmailProcessingMetricsDto
        {
            TotalCompleted = totalCompleted,
            TotalSucceeded = succeeded,
            TotalFailed = failed,
            SuccessRate = successRate,
            TotalReviewInboxOpen = reviewInboxOpen,
            TotalStuckProcessing = stuckProcessing,
            DailyVolume = dailyVolume,
            ByFailureCategory = byFailureCategory,
            TopFailureReasons = topFailureReasons,
            ByDocumentType = byDocumentType,
            DailyFailuresByCategory = dailyFailuresByCategory,
            QualityTrend = qualityTrend,
        };
    }

    private static async Task<SupportQualityTrendDto> LoadQualityTrendAsync(
        NpgsqlConnection conn,
        DateTimeOffset fromInclusive,
        DateTimeOffset toExclusive,
        double currentSuccessRate,
        int currentFailed,
        CancellationToken cancellationToken)
    {
        var span = toExclusive - fromInclusive;
        if (span <= TimeSpan.Zero)
            span = TimeSpan.FromDays(30);

        var previousTo = fromInclusive;
        var previousFrom = previousTo - span;

        const string sql = """
            SELECT
              COUNT(*) FILTER (WHERE pe.success = true)::int AS succeeded,
              COUNT(*) FILTER (WHERE pe.success = false)::int AS failed
            FROM public.processed_emails pe
            WHERE pe.status = 'completed'
              AND pe.completed_at >= @from
              AND pe.completed_at < @to
            """;

        int prevSucceeded;
        int prevFailed;
        await using (var cmd = new NpgsqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("from", previousFrom);
            cmd.Parameters.AddWithValue("to", previousTo);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                throw new InvalidOperationException("Previous period totals query returned no row.");

            prevSucceeded = reader.GetInt32(0);
            prevFailed = reader.GetInt32(1);
        }

        var prevTotal = prevSucceeded + prevFailed;
        var prevSuccessRate = prevTotal > 0 ? Math.Round(prevSucceeded * 100.0 / prevTotal, 1) : 0;

        return new SupportQualityTrendDto
        {
            PreviousFrom = previousFrom,
            PreviousTo = previousTo,
            PreviousSuccessRate = prevSuccessRate,
            SuccessRateDelta = Math.Round(currentSuccessRate - prevSuccessRate, 1),
            PreviousFailed = prevFailed,
            FailedDelta = currentFailed - prevFailed,
        };
    }

    private static async Task<IReadOnlyList<SupportDailyProcessingVolumeDto>> LoadDailyVolumeAsync(
        NpgsqlConnection conn,
        DateTimeOffset fromInclusive,
        DateTimeOffset toExclusive,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
              (date_trunc('day', pe.completed_at AT TIME ZONE 'UTC'))::date AS day,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE pe.success = true)::int AS succeeded,
              COUNT(*) FILTER (WHERE pe.success = false)::int AS failed
            FROM public.processed_emails pe
            WHERE pe.status = 'completed'
              AND pe.completed_at >= @from
              AND pe.completed_at < @to
            GROUP BY day
            ORDER BY day
            """;

        var items = new List<SupportDailyProcessingVolumeDto>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("from", fromInclusive);
        cmd.Parameters.AddWithValue("to", toExclusive);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new SupportDailyProcessingVolumeDto
            {
                Date = reader.GetDateTime(0).ToString("yyyy-MM-dd"),
                Total = reader.GetInt32(1),
                Succeeded = reader.GetInt32(2),
                Failed = reader.GetInt32(3),
            });
        }

        return items;
    }

    private static async Task<IReadOnlyList<SupportFailureCategoryBucketDto>> LoadFailureCategoriesAsync(
        NpgsqlConnection conn,
        DateTimeOffset fromInclusive,
        DateTimeOffset toExclusive,
        int totalFailed,
        CancellationToken cancellationToken)
    {
        var categoryExpr = EmailFailureReasonClassifier.BuildSqlCategoryCaseExpression();
        var sql = $"""
            SELECT
              category,
              COUNT(*)::int AS cnt,
              MIN(completed_at) AS first_seen,
              MAX(completed_at) AS last_seen
            FROM (
              SELECT
                {categoryExpr} AS category,
                pe.completed_at
              FROM public.processed_emails pe
              WHERE pe.status = 'completed'
                AND pe.success = false
                AND pe.completed_at >= @from
                AND pe.completed_at < @to
            ) grouped
            GROUP BY category
            ORDER BY cnt DESC, category
            """;

        var items = new List<SupportFailureCategoryBucketDto>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("from", fromInclusive);
        cmd.Parameters.AddWithValue("to", toExclusive);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var category = reader.GetString(0);
            var count = reader.GetInt32(1);
            items.Add(new SupportFailureCategoryBucketDto
            {
                Category = category,
                Label = EmailFailureReasonClassifier.GetCategoryLabel(category),
                Description = EmailFailureReasonClassifier.GetCategoryDescription(category),
                Count = count,
                ShareOfFailures = totalFailed > 0 ? Math.Round(count * 100.0 / totalFailed, 1) : 0,
                FirstSeenAt = reader.GetFieldValue<DateTimeOffset>(2),
                LastSeenAt = reader.GetFieldValue<DateTimeOffset>(3),
            });
        }

        return items;
    }

    private static async Task<IReadOnlyList<SupportTopFailureReasonDto>> LoadTopFailureReasonsAsync(
        NpgsqlConnection conn,
        DateTimeOffset fromInclusive,
        DateTimeOffset toExclusive,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
              LEFT(COALESCE(NULLIF(trim(pe.failure_reason), ''), '(empty)'), 220) AS reason_key,
              COUNT(*)::int AS cnt,
              MIN(pe.completed_at) AS first_seen,
              MAX(pe.completed_at) AS last_seen
            FROM public.processed_emails pe
            WHERE pe.status = 'completed'
              AND pe.success = false
              AND pe.completed_at >= @from
              AND pe.completed_at < @to
            GROUP BY reason_key
            ORDER BY cnt DESC, reason_key
            LIMIT @limit
            """;

        var items = new List<SupportTopFailureReasonDto>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("from", fromInclusive);
        cmd.Parameters.AddWithValue("to", toExclusive);
        cmd.Parameters.AddWithValue("limit", TopFailureReasonLimit);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var reason = reader.GetString(0);
            items.Add(new SupportTopFailureReasonDto
            {
                Reason = reason,
                Category = EmailFailureReasonClassifier.Classify(
                    reason == "(empty)" ? null : reason),
                Count = reader.GetInt32(1),
                FirstSeenAt = reader.GetFieldValue<DateTimeOffset>(2),
                LastSeenAt = reader.GetFieldValue<DateTimeOffset>(3),
            });
        }

        return items;
    }

    private static async Task<IReadOnlyList<SupportDailyFailureCategoryDto>> LoadDailyFailuresByCategoryAsync(
        NpgsqlConnection conn,
        DateTimeOffset fromInclusive,
        DateTimeOffset toExclusive,
        CancellationToken cancellationToken)
    {
        var categoryExpr = EmailFailureReasonClassifier.BuildSqlCategoryCaseExpression();
        var sql = $"""
            SELECT
              (date_trunc('day', completed_at AT TIME ZONE 'UTC'))::date AS day,
              category,
              COUNT(*)::int AS cnt
            FROM (
              SELECT
                pe.completed_at,
                {categoryExpr} AS category
              FROM public.processed_emails pe
              WHERE pe.status = 'completed'
                AND pe.success = false
                AND pe.completed_at >= @from
                AND pe.completed_at < @to
            ) grouped
            GROUP BY day, category
            ORDER BY day, category
            """;

        var items = new List<SupportDailyFailureCategoryDto>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("from", fromInclusive);
        cmd.Parameters.AddWithValue("to", toExclusive);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var category = reader.GetString(1);
            items.Add(new SupportDailyFailureCategoryDto
            {
                Date = reader.GetDateTime(0).ToString("yyyy-MM-dd"),
                Category = category,
                Label = EmailFailureReasonClassifier.GetCategoryLabel(category),
                Count = reader.GetInt32(2),
            });
        }

        return items;
    }

    private static async Task<IReadOnlyList<SupportDocumentTypeOutcomeDto>> LoadDocumentTypeOutcomesAsync(
        NpgsqlConnection conn,
        DateTimeOffset fromInclusive,
        DateTimeOffset toExclusive,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
              COALESCE(pe.document_type, '') AS document_type,
              COUNT(*) FILTER (WHERE pe.success = true)::int AS succeeded,
              COUNT(*) FILTER (WHERE pe.success = false)::int AS failed
            FROM public.processed_emails pe
            WHERE pe.status = 'completed'
              AND pe.completed_at >= @from
              AND pe.completed_at < @to
            GROUP BY COALESCE(pe.document_type, '')
            ORDER BY (COUNT(*) FILTER (WHERE pe.success = false)) DESC,
                     (COUNT(*) FILTER (WHERE pe.success = true)) DESC,
                     document_type
            """;

        var items = new List<SupportDocumentTypeOutcomeDto>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("from", fromInclusive);
        cmd.Parameters.AddWithValue("to", toExclusive);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var succeeded = reader.GetInt32(1);
            var failedCount = reader.GetInt32(2);
            var total = succeeded + failedCount;
            items.Add(new SupportDocumentTypeOutcomeDto
            {
                DocumentType = reader.GetString(0),
                Succeeded = succeeded,
                Failed = failedCount,
                SuccessRate = total > 0 ? Math.Round(succeeded * 100.0 / total, 1) : 0,
            });
        }

        return items;
    }

    private static async Task<SupportVaultProcessingMetricsDto> LoadVaultMetricsAsync(
        NpgsqlConnection conn,
        DateTimeOffset fromInclusive,
        DateTimeOffset toExclusive,
        CancellationToken cancellationToken)
    {
        const string totalsSql = """
            SELECT
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE pd.clinical_synced_at IS NOT NULL)::int AS synced,
              COUNT(*) FILTER (
                WHERE NULLIF(trim(pd.clinical_sync_error), '') IS NOT NULL
              )::int AS sync_errors,
              COUNT(*) FILTER (
                WHERE pd.clinical_synced_at IS NULL
                  AND NULLIF(trim(pd.clinical_sync_error), '') IS NULL
              )::int AS pending_sync
            FROM public.pet_documents pd
            WHERE pd.created_at >= @from
              AND pd.created_at < @to
            """;

        int total;
        int synced;
        int syncErrors;
        int pendingSync;
        await using (var cmd = new NpgsqlCommand(totalsSql, conn))
        {
            cmd.Parameters.AddWithValue("from", fromInclusive);
            cmd.Parameters.AddWithValue("to", toExclusive);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                throw new InvalidOperationException("Vault totals query returned no row.");

            total = reader.GetInt32(0);
            synced = reader.GetInt32(1);
            syncErrors = reader.GetInt32(2);
            pendingSync = reader.GetInt32(3);
        }

        const string byTypeSql = """
            SELECT COALESCE(pd.document_type::text, '') AS document_type, COUNT(*)::int AS cnt
            FROM public.pet_documents pd
            WHERE pd.created_at >= @from
              AND pd.created_at < @to
            GROUP BY COALESCE(pd.document_type::text, '')
            ORDER BY cnt DESC, document_type
            """;

        var byType = new List<SupportVaultDocumentTypeBucketDto>();
        await using (var typeCmd = new NpgsqlCommand(byTypeSql, conn))
        {
            typeCmd.Parameters.AddWithValue("from", fromInclusive);
            typeCmd.Parameters.AddWithValue("to", toExclusive);
            await using var reader = await typeCmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                byType.Add(new SupportVaultDocumentTypeBucketDto
                {
                    DocumentType = reader.GetString(0),
                    Count = reader.GetInt32(1),
                });
            }
        }

        return new SupportVaultProcessingMetricsDto
        {
            TotalDocuments = total,
            ClinicalSynced = synced,
            ClinicalSyncErrors = syncErrors,
            PendingClinicalSync = pendingSync,
            ByDocumentType = byType,
        };
    }
}
