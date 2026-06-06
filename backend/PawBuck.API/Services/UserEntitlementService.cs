using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class UserEntitlementService : IUserEntitlementService
{
    private readonly IOptions<SupabaseOptions> _options;

    public UserEntitlementService(IOptions<SupabaseOptions> options)
    {
        _options = options;
    }

    private NpgsqlConnection CreateConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");
        return new NpgsqlConnection(cs);
    }

    /// <inheritdoc />
    public async Task<bool> HasActivePremiumAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var plan = await GetActivePlanAsync(userId, cancellationToken);
        return SubscriptionPlans.Rank(plan) >= SubscriptionPlans.Rank(SubscriptionPlans.Individual);
    }

    /// <inheritdoc />
    public async Task<string> GetActivePlanAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return SubscriptionPlans.Free;

        const string sql = """
            SELECT plan
            FROM public.user_entitlements
            WHERE user_id = @userId
              AND (
                is_founding_member = TRUE
                OR expires_at IS NULL
                OR expires_at > now()
              )
            LIMIT 1
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        if (o is string plan && !string.IsNullOrWhiteSpace(plan))
            return plan == SubscriptionPlans.LegacyPremium ? SubscriptionPlans.Individual : plan;

        return SubscriptionPlans.Free;
    }

    /// <inheritdoc />
    public async Task<bool> MeetsMinimumPlanAsync(Guid userId, string minimumPlan, CancellationToken cancellationToken = default)
    {
        var active = await GetActivePlanAsync(userId, cancellationToken);
        return SubscriptionPlans.MeetsMinimum(active, minimumPlan);
    }

    /// <inheritdoc />
    public async Task<bool> IsFoundingMemberAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return false;

        const string sql = """
            SELECT is_founding_member
            FROM public.user_entitlements
            WHERE user_id = @userId
            LIMIT 1
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        return o is true;
    }

    /// <inheritdoc />
    public async Task<SubscriptionStatusResponse?> GetStatusAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return null;

        const string sql = """
            SELECT
              COALESCE(u.plan, 'free') AS plan,
              COALESCE(u.is_founding_member, FALSE) AS is_founding_member,
              u.product_id,
              u.expires_at,
              COALESCE(s.milo_conversations_used, 0) AS milo_used,
              COALESCE(s.ai_journal_entries_used, 0) AS journal_used,
              l.max_pets,
              l.max_documents,
              l.max_family_members,
              l.max_milo_conversations,
              l.max_ai_journal_entries,
              GREATEST(0, 500 - COALESCE(f.purchase_count, 0)) AS founding_remaining,
              public.get_user_document_count(@userId) AS doc_count
            FROM (SELECT @userId::uuid AS user_id) q
            LEFT JOIN public.user_entitlements u ON u.user_id = q.user_id
            LEFT JOIN public.user_subscription_usage s ON s.user_id = q.user_id
            LEFT JOIN public.subscription_limits l ON l.plan = COALESCE(u.plan, 'free')
            CROSS JOIN public.founding_member_counter f
            WHERE f.id = 1
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);

        var plan = reader.GetString(0);
        if (plan == SubscriptionPlans.LegacyPremium) plan = SubscriptionPlans.Individual;

        return new SubscriptionStatusResponse
        {
            Plan = plan,
            IsFoundingMember = reader.GetBoolean(1),
            ProductId = reader.IsDBNull(2) ? null : reader.GetString(2),
            ExpiresAt = reader.IsDBNull(3) ? null : reader.GetFieldValue<DateTimeOffset>(3),
            Usage = new SubscriptionUsageDto
            {
                MiloConversationsUsed = reader.GetInt32(4),
                AiJournalEntriesUsed = reader.GetInt32(5),
            },
            Limits = new SubscriptionLimitsDto
            {
                MaxPets = reader.IsDBNull(6) ? null : reader.GetInt32(6),
                MaxDocuments = reader.IsDBNull(7) ? null : reader.GetInt32(7),
                MaxFamilyMembers = reader.IsDBNull(8) ? 0 : reader.GetInt32(8),
                MaxMiloConversations = reader.IsDBNull(9) ? null : reader.GetInt32(9),
                MaxAiJournalEntries = reader.IsDBNull(10) ? null : reader.GetInt32(10),
            },
            FoundingSpotsRemaining = reader.IsDBNull(11) ? null : Math.Max(0, reader.GetInt32(11)),
            DocumentCount = reader.GetInt32(12),
        };
    }

    /// <inheritdoc />
    public async Task AssertMiloConversationAllowedAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return;

        var plan = await GetActivePlanAsync(userId, cancellationToken);
        if (SubscriptionPlans.Rank(plan) >= SubscriptionPlans.Rank(SubscriptionPlans.Individual))
            return;

        const string checkSql = """
            SELECT COALESCE(s.milo_conversations_used, 0), l.max_milo_conversations
            FROM public.subscription_limits l
            LEFT JOIN public.user_subscription_usage s ON s.user_id = @userId
            WHERE l.plan = 'free'
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(checkSql, conn);
        cmd.Parameters.AddWithValue("userId", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return;

        var used = reader.GetInt32(0);
        if (reader.IsDBNull(1))
            return;

        var max = reader.GetInt32(1);
        if (used >= max)
            throw new SubscriptionLimitException("milo_conversation_cap", SubscriptionPlans.Individual,
                $"Milo conversation limit reached ({max} lifetime). Upgrade to Individual for unlimited Milo.");
    }

    /// <inheritdoc />
    public async Task<int> IncrementMiloConversationUsageAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return 0;

        const string sql = "SELECT public.increment_milo_conversation_usage(@userId)";

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        return o is int n ? n : Convert.ToInt32(o);
    }

    /// <inheritdoc />
    public async Task AssertAiJournalAllowedAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return;

        var plan = await GetActivePlanAsync(userId, cancellationToken);
        if (SubscriptionPlans.Rank(plan) >= SubscriptionPlans.Rank(SubscriptionPlans.Individual))
            return;

        const string checkSql = """
            SELECT COALESCE(s.ai_journal_entries_used, 0), l.max_ai_journal_entries
            FROM public.subscription_limits l
            LEFT JOIN public.user_subscription_usage s ON s.user_id = @userId
            WHERE l.plan = 'free'
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(checkSql, conn);
        cmd.Parameters.AddWithValue("userId", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return;

        var used = reader.GetInt32(0);
        if (reader.IsDBNull(1))
            return;

        var max = reader.GetInt32(1);
        if (used >= max)
            throw new SubscriptionLimitException("ai_journal_entry_cap", SubscriptionPlans.Individual,
                $"AI journal entry limit reached ({max} lifetime). Upgrade to Individual for unlimited entries.");
    }

    /// <inheritdoc />
    public async Task<int> IncrementAiJournalUsageAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return 0;

        const string sql = "SELECT public.increment_ai_journal_usage(@userId)";

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        return o is int n ? n : Convert.ToInt32(o);
    }

    /// <inheritdoc />
    public async Task<FoundingMemberStatsResponse?> GetFoundingMemberStatsAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return null;

        const string sql = """
            SELECT COALESCE(purchase_count, 0)
            FROM public.founding_member_counter
            WHERE id = 1
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        var purchaseCount = o is int n ? n : Convert.ToInt32(o ?? 0);
        const int cap = 500;
        return new FoundingMemberStatsResponse
        {
            PurchaseCount = purchaseCount,
            SpotsRemaining = Math.Max(0, cap - purchaseCount),
            Cap = cap,
        };
    }

    /// <inheritdoc />
    public async Task<SubscriptionPlanBreakdownResponse?> GetPlanBreakdownAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return null;

        const string sql = """
            WITH owners AS (
              SELECT id AS user_id FROM auth.users
            ),
            ent AS (
              SELECT
                o.user_id,
                CASE
                  WHEN u.plan = 'premium' THEN 'individual'
                  WHEN u.plan IN ('individual', 'family') THEN u.plan
                  ELSE 'free'
                END AS plan,
                COALESCE(u.is_founding_member, FALSE) AS is_founding_member,
                u.expires_at,
                u.user_id IS NULL AS missing_row
              FROM owners o
              LEFT JOIN public.user_entitlements u ON u.user_id = o.user_id
            ),
            normalized AS (
              SELECT
                user_id,
                plan,
                is_founding_member,
                missing_row,
                CASE
                  WHEN is_founding_member THEN TRUE
                  WHEN plan IN ('individual', 'family') AND (expires_at IS NULL OR expires_at > now()) THEN TRUE
                  WHEN plan IN ('individual', 'family') THEN FALSE
                  ELSE TRUE
                END AS is_active_paid
              FROM ent
            )
            SELECT
              (SELECT COUNT(*)::int FROM owners) AS total_users,
              (SELECT COUNT(*)::int FROM normalized WHERE missing_row) AS no_row,
              (SELECT COUNT(*)::int FROM normalized WHERE NOT is_active_paid AND plan IN ('individual', 'family') AND NOT is_founding_member) AS expired_paid,
              (SELECT COUNT(*)::int FROM normalized WHERE is_founding_member) AS founding_total,
              plan,
              COUNT(*)::int AS user_count,
              COUNT(*) FILTER (WHERE is_founding_member)::int AS founding_in_tier
            FROM normalized
            GROUP BY plan
            ORDER BY plan
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var tiers = new List<SubscriptionPlanTierCountDto>();
        int totalUsers = 0;
        int noRow = 0;
        int expiredPaid = 0;
        int foundingTotal = 0;
        var firstRow = true;

        while (await reader.ReadAsync(cancellationToken))
        {
            if (firstRow)
            {
                totalUsers = reader.GetInt32(0);
                noRow = reader.GetInt32(1);
                expiredPaid = reader.GetInt32(2);
                foundingTotal = reader.GetInt32(3);
                firstRow = false;
            }

            tiers.Add(new SubscriptionPlanTierCountDto
            {
                Plan = reader.GetString(4),
                UserCount = reader.GetInt32(5),
                FoundingMembers = reader.GetInt32(6),
            });
        }

        if (firstRow)
        {
            return new SubscriptionPlanBreakdownResponse
            {
                TotalUsers = 0,
                UsersWithoutEntitlementRow = 0,
                ExpiredPaidSubscriptions = 0,
                FoundingMembers = 0,
                Tiers = [],
                AsOf = DateTimeOffset.UtcNow,
            };
        }

        return new SubscriptionPlanBreakdownResponse
        {
            TotalUsers = totalUsers,
            UsersWithoutEntitlementRow = noRow,
            ExpiredPaidSubscriptions = expiredPaid,
            FoundingMembers = foundingTotal,
            Tiers = tiers,
            AsOf = DateTimeOffset.UtcNow,
        };
    }
}

/// <summary>Thrown when a free-tier lifetime cap is exceeded.</summary>
public sealed class SubscriptionLimitException : Exception
{
    public string Code { get; }
    public string UpgradePlan { get; }

    public SubscriptionLimitException(string code, string upgradePlan, string message) : base(message)
    {
        Code = code;
        UpgradePlan = upgradePlan;
    }
}
