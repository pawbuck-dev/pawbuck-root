using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Pure feedback validation rules for journal Milo turns (testable without DB).</summary>
public static class MiloJournalFeedbackRules
{
    public static bool IsValidRating(string? rating)
    {
        var r = (rating ?? "").Trim().ToLowerInvariant();
        return r is "up" or "down";
    }

    public static bool IsWithinFeedbackWindow(DateTime turnCreatedUtc, DateTime nowUtc, TimeSpan maxAge) =>
        nowUtc - turnCreatedUtc.ToUniversalTime() <= maxAge;
}

public sealed class MiloJournalTurnService : IMiloJournalTurnService, IMiloJournalFeedbackAggregateService
{
    private static readonly TimeSpan FeedbackMaxAge = TimeSpan.FromDays(14);

    private readonly IOptions<SupabaseOptions> _options;
    private readonly ILogger<MiloJournalTurnService> _logger;

    public MiloJournalTurnService(IOptions<SupabaseOptions> options, ILogger<MiloJournalTurnService> logger)
    {
        _options = options;
        _logger = logger;
    }

    private NpgsqlConnection CreateConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");
        return new NpgsqlConnection(cs);
    }

    public async Task<Guid> RegisterTurnAsync(
        Guid userId,
        Guid? petId,
        string promptVersion,
        IReadOnlyList<string> heuristicTags,
        string chatKind,
        CancellationToken cancellationToken = default)
    {
        var id = Guid.NewGuid();
        var kind = string.IsNullOrWhiteSpace(chatKind) ? "journal" : chatKind.Trim().ToLowerInvariant();
        if (kind is not ("journal" or "general"))
            kind = "journal";

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            INSERT INTO public.milo_journal_chat_turns (id, user_id, pet_id, prompt_version, heuristic_tags, chat_kind, created_at)
            VALUES (@id, @userId, @petId, @pv, @tags, @chatKind, timezone('utc', now()))
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("petId", petId.HasValue ? petId.Value : (object)DBNull.Value);
        cmd.Parameters.AddWithValue("pv", promptVersion);
        cmd.Parameters.AddWithValue("tags", heuristicTags.ToArray());
        cmd.Parameters.AddWithValue("chatKind", kind);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
        return id;
    }

    public async Task<bool> TrySubmitFeedbackAsync(
        Guid userId,
        Guid turnId,
        string rating,
        string? feedbackReason = null,
        string? treeVersion = null,
        int? questionsAsked = null,
        string? feedbackStage = null,
        CancellationToken cancellationToken = default)
    {
        var r = rating.Trim().ToLowerInvariant();
        if (!MiloJournalFeedbackRules.IsValidRating(r))
            return false;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        const string verify = """
            SELECT user_id, created_at FROM public.milo_journal_chat_turns WHERE id = @id LIMIT 1
            """;
        await using var vcmd = new NpgsqlCommand(verify, conn);
        vcmd.Parameters.AddWithValue("id", turnId);
        await using var reader = await vcmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return false;
        var owner = reader.GetGuid(0);
        var created = reader.GetDateTime(1);
        await reader.CloseAsync();
        if (owner != userId)
            return false;
        if (!MiloJournalFeedbackRules.IsWithinFeedbackWindow(created, DateTime.UtcNow, FeedbackMaxAge))
            return false;

        const string upsert = """
            INSERT INTO public.milo_journal_message_feedback (
              id, turn_id, user_id, rating, feedback_reason, tree_version, questions_asked, feedback_stage, created_at)
            VALUES (
              gen_random_uuid(), @turnId, @userId, @rating, @reason, @treeVersion, @questionsAsked, @stage, timezone('utc', now()))
            ON CONFLICT (turn_id) DO UPDATE SET
              rating = EXCLUDED.rating,
              feedback_reason = EXCLUDED.feedback_reason,
              tree_version = EXCLUDED.tree_version,
              questions_asked = EXCLUDED.questions_asked,
              feedback_stage = EXCLUDED.feedback_stage,
              created_at = timezone('utc', now())
            """;
        await using var icmd = new NpgsqlCommand(upsert, conn);
        icmd.Parameters.AddWithValue("turnId", turnId);
        icmd.Parameters.AddWithValue("userId", userId);
        icmd.Parameters.AddWithValue("rating", r);
        icmd.Parameters.AddWithValue("reason", string.IsNullOrWhiteSpace(feedbackReason) ? DBNull.Value : feedbackReason.Trim());
        icmd.Parameters.AddWithValue("treeVersion", string.IsNullOrWhiteSpace(treeVersion) ? DBNull.Value : treeVersion.Trim());
        icmd.Parameters.AddWithValue("questionsAsked", questionsAsked.HasValue ? questionsAsked.Value : DBNull.Value);
        icmd.Parameters.AddWithValue("stage", string.IsNullOrWhiteSpace(feedbackStage) ? DBNull.Value : feedbackStage.Trim());
        await icmd.ExecuteNonQueryAsync(cancellationToken);
        return true;
    }

    public async Task<MiloJournalFeedbackAggregatesDto> GetAggregatesAsync(CancellationToken cancellationToken = default)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        const string totals = """
            SELECT
              count(*)::int,
              count(*) FILTER (WHERE rating = 'up')::int,
              count(*) FILTER (WHERE rating = 'down')::int
            FROM public.milo_journal_message_feedback
            """;

        await using var tcmd = new NpgsqlCommand(totals, conn);
        await using var tr = await tcmd.ExecuteReaderAsync(cancellationToken);
        await tr.ReadAsync(cancellationToken);
        var total = tr.GetInt32(0);
        var up = tr.GetInt32(1);
        var down = tr.GetInt32(2);
        await tr.CloseAsync();

        const string byVersion = """
            SELECT t.prompt_version,
              count(*) FILTER (WHERE f.rating = 'up')::int,
              count(*) FILTER (WHERE f.rating = 'down')::int
            FROM public.milo_journal_message_feedback f
            JOIN public.milo_journal_chat_turns t ON t.id = f.turn_id
            GROUP BY t.prompt_version
            ORDER BY t.prompt_version
            """;

        var byList = new List<MiloJournalFeedbackByVersionDto>();
        await using var vcmd = new NpgsqlCommand(byVersion, conn);
        await using var vr = await vcmd.ExecuteReaderAsync(cancellationToken);
        while (await vr.ReadAsync(cancellationToken))
        {
            byList.Add(new MiloJournalFeedbackByVersionDto
            {
                PromptVersion = vr.GetString(0),
                UpCount = vr.GetInt32(1),
                DownCount = vr.GetInt32(2),
            });
        }

        var byTree = new List<MiloJournalFeedbackByVersionDto>();
        const string byTreeSql = """
            SELECT coalesce(tree_version, 'unknown'),
              count(*) FILTER (WHERE rating = 'up')::int,
              count(*) FILTER (WHERE rating = 'down')::int
            FROM public.milo_journal_message_feedback
            WHERE tree_version IS NOT NULL AND trim(tree_version) <> ''
            GROUP BY tree_version
            ORDER BY tree_version
            """;
        await using (var tcmd2 = new NpgsqlCommand(byTreeSql, conn))
        await using (var tr2 = await tcmd2.ExecuteReaderAsync(cancellationToken))
        {
            while (await tr2.ReadAsync(cancellationToken))
            {
                byTree.Add(new MiloJournalFeedbackByVersionDto
                {
                    PromptVersion = tr2.GetString(0),
                    UpCount = tr2.GetInt32(1),
                    DownCount = tr2.GetInt32(2),
                });
            }
        }

        return new MiloJournalFeedbackAggregatesDto
        {
            TotalFeedback = total,
            UpCount = up,
            DownCount = down,
            ByPromptVersion = byList,
            ByTreeVersion = byTree,
        };
    }
}
