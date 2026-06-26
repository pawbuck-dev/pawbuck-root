using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class SupportMiloQualityService : ISupportMiloQualityService
{
    private const int MaxLimit = 200;
    private const int DefaultLimit = 50;

    private readonly IOptions<SupabaseOptions> _options;

    public SupportMiloQualityService(IOptions<SupabaseOptions> options) => _options = options;

    public async Task<SupportMiloQualityOverviewResponse> GetOverviewAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default)
    {
        var range = ResolveRange(from, to);
        await using var conn = OpenConnection();
        await conn.OpenAsync(cancellationToken);

        const string totalsSql = """
            SELECT
              count(*)::int,
              count(*) FILTER (WHERE outcome = 'success')::int,
              count(*) FILTER (WHERE outcome = 'partial')::int,
              count(*) FILTER (WHERE outcome = 'failed')::int
            FROM public.milo_interaction_outcomes
            WHERE created_at >= @from AND created_at < @to
            """;

        int total;
        int success;
        int partial;
        int failed;
        await using (var cmd = new NpgsqlCommand(totalsSql, conn))
        {
            cmd.Parameters.AddWithValue("from", range.From);
            cmd.Parameters.AddWithValue("to", range.To);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            await reader.ReadAsync(cancellationToken);
            total = reader.GetInt32(0);
            success = reader.GetInt32(1);
            partial = reader.GetInt32(2);
            failed = reader.GetInt32(3);
        }

        var bySurface = await LoadBucketsAsync(
            conn,
            """
            SELECT surface, count(*)::int
            FROM public.milo_interaction_outcomes
            WHERE created_at >= @from AND created_at < @to
            GROUP BY surface ORDER BY count(*) DESC
            """,
            range,
            cancellationToken);

        var topFailures = await LoadBucketsAsync(
            conn,
            """
            SELECT failure_code, count(*)::int
            FROM public.milo_interaction_outcomes
            WHERE created_at >= @from AND created_at < @to
              AND failure_code IS NOT NULL AND trim(failure_code) <> ''
            GROUP BY failure_code ORDER BY count(*) DESC LIMIT 15
            """,
            range,
            cancellationToken);

        var successRate = total > 0 ? Math.Round(success * 100.0 / total, 1) : 0;

        return new SupportMiloQualityOverviewResponse
        {
            From = range.From,
            To = range.To,
            Total = total,
            SuccessCount = success,
            PartialCount = partial,
            FailedCount = failed,
            SuccessRate = successRate,
            BySurface = bySurface,
            TopFailureCodes = topFailures,
        };
    }

    public async Task<SupportMiloQualityOutcomesResponse> ListOutcomesAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        Guid? petId,
        Guid? userId,
        string? surface,
        string? outcome,
        string? failureCode,
        int limit,
        CancellationToken cancellationToken = default)
    {
        var range = ResolveRange(from, to);
        var take = limit <= 0 ? DefaultLimit : Math.Min(limit, MaxLimit);

        await using var conn = OpenConnection();
        await conn.OpenAsync(cancellationToken);

        var where = new List<string> { "created_at >= @from", "created_at < @to" };
        if (petId.HasValue)
            where.Add("pet_id = @petId");
        if (userId.HasValue)
            where.Add("user_id = @userId");
        if (!string.IsNullOrWhiteSpace(surface))
            where.Add("surface = @surface");
        if (!string.IsNullOrWhiteSpace(outcome))
            where.Add("outcome = @outcome");
        if (!string.IsNullOrWhiteSpace(failureCode))
            where.Add("failure_code = @failureCode");

        var whereClause = string.Join(" AND ", where);

        var countSql = $"""
            SELECT count(*)::int FROM public.milo_interaction_outcomes WHERE {whereClause}
            """;

        var listSql = $"""
            SELECT id, created_at, user_id, pet_id, turn_id, document_id, surface, outcome, failure_code,
                   intent_tags, used_rag, used_curated, used_pet_facts, journal_emergency_stop,
                   document_type, confidence, model_id
            FROM public.milo_interaction_outcomes
            WHERE {whereClause}
            ORDER BY created_at DESC
            LIMIT @limit
            """;

        int total;
        await using (var countCmd = new NpgsqlCommand(countSql, conn))
        {
            BindFilters(countCmd, range, petId, userId, surface, outcome, failureCode);
            total = Convert.ToInt32(await countCmd.ExecuteScalarAsync(cancellationToken) ?? 0);
        }

        var items = new List<SupportMiloQualityOutcomeRow>();
        await using (var listCmd = new NpgsqlCommand(listSql, conn))
        {
            BindFilters(listCmd, range, petId, userId, surface, outcome, failureCode);
            listCmd.Parameters.AddWithValue("limit", take);
            await using var reader = await listCmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                items.Add(new SupportMiloQualityOutcomeRow
                {
                    Id = reader.GetGuid(0),
                    CreatedAt = reader.GetDateTime(1),
                    UserId = reader.IsDBNull(2) ? null : reader.GetGuid(2),
                    PetId = reader.IsDBNull(3) ? null : reader.GetGuid(3),
                    TurnId = reader.IsDBNull(4) ? null : reader.GetGuid(4),
                    DocumentId = reader.IsDBNull(5) ? null : reader.GetGuid(5),
                    Surface = reader.GetString(6),
                    Outcome = reader.GetString(7),
                    FailureCode = reader.IsDBNull(8) ? null : reader.GetString(8),
                    IntentTags = reader.IsDBNull(9) ? Array.Empty<string>() : reader.GetFieldValue<string[]>(9),
                    UsedRag = reader.GetBoolean(10),
                    UsedCurated = reader.GetBoolean(11),
                    UsedPetFacts = reader.GetBoolean(12),
                    JournalEmergencyStop = reader.GetBoolean(13),
                    DocumentType = reader.IsDBNull(14) ? null : reader.GetString(14),
                    Confidence = reader.IsDBNull(15) ? null : reader.GetDouble(15),
                    ModelId = reader.IsDBNull(16) ? null : reader.GetString(16),
                });
            }
        }

        return new SupportMiloQualityOutcomesResponse
        {
            From = range.From,
            To = range.To,
            Total = total,
            Items = items,
        };
    }

    private static void BindFilters(
        NpgsqlCommand cmd,
        (DateTimeOffset From, DateTimeOffset To) range,
        Guid? petId,
        Guid? userId,
        string? surface,
        string? outcome,
        string? failureCode)
    {
        cmd.Parameters.AddWithValue("from", range.From);
        cmd.Parameters.AddWithValue("to", range.To);
        if (petId.HasValue)
            cmd.Parameters.AddWithValue("petId", petId.Value);
        if (userId.HasValue)
            cmd.Parameters.AddWithValue("userId", userId.Value);
        if (!string.IsNullOrWhiteSpace(surface))
            cmd.Parameters.AddWithValue("surface", surface.Trim());
        if (!string.IsNullOrWhiteSpace(outcome))
            cmd.Parameters.AddWithValue("outcome", outcome.Trim());
        if (!string.IsNullOrWhiteSpace(failureCode))
            cmd.Parameters.AddWithValue("failureCode", failureCode.Trim());
    }

    private static async Task<IReadOnlyList<SupportMiloQualityBucketRow>> LoadBucketsAsync(
        NpgsqlConnection conn,
        string sql,
        (DateTimeOffset From, DateTimeOffset To) range,
        CancellationToken cancellationToken)
    {
        var rows = new List<SupportMiloQualityBucketRow>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("from", range.From);
        cmd.Parameters.AddWithValue("to", range.To);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new SupportMiloQualityBucketRow
            {
                Key = reader.GetString(0),
                Count = reader.GetInt32(1),
            });
        }

        return rows;
    }

    private static (DateTimeOffset From, DateTimeOffset To) ResolveRange(DateTimeOffset? from, DateTimeOffset? to)
    {
        var toExclusive = to ?? DateTimeOffset.UtcNow;
        var fromInclusive = from ?? toExclusive.AddDays(-30);
        return (fromInclusive, toExclusive);
    }

    private NpgsqlConnection OpenConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured");
        return new NpgsqlConnection(cs);
    }
}
