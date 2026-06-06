using System.Net.Sockets;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class SubscriptionFeatureGateService : ISubscriptionFeatureGateService
{
    public const string CacheKey = "subscription_feature_gates_all";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(60);

    private readonly IOptions<SupabaseOptions> _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SubscriptionFeatureGateService> _logger;

    public SubscriptionFeatureGateService(
        IOptions<SupabaseOptions> options,
        IMemoryCache cache,
        ILogger<SubscriptionFeatureGateService> logger)
    {
        _options = options;
        _cache = cache;
        _logger = logger;
    }

    private NpgsqlConnection CreateConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");
        return new NpgsqlConnection(cs);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<SubscriptionFeatureGateDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return Array.Empty<SubscriptionFeatureGateDto>();

        return await _cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            return await LoadAllFromDbAsync(cancellationToken);
        }) ?? Array.Empty<SubscriptionFeatureGateDto>();
    }

    private async Task<IReadOnlyList<SubscriptionFeatureGateDto>> LoadAllFromDbAsync(CancellationToken cancellationToken)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                return await LoadAllFromDbOnceAsync(cancellationToken);
            }
            catch (Exception ex) when (IsTransientPostgresReadFailure(ex))
            {
                if (attempt >= maxAttempts)
                    throw;

                _logger.LogWarning(
                    ex,
                    "subscription_feature_gates read attempt {Attempt}/{Max} failed (transient); retrying",
                    attempt,
                    maxAttempts);
                await Task.Delay(TimeSpan.FromMilliseconds(100 * attempt), cancellationToken);
            }
        }

        throw new InvalidOperationException("subscription_feature_gates read failed after retries");
    }

    /// <summary>
    /// Pooler/network drops or SSL resets mid-read; short retries often succeed. Do not retry SQL errors (wrong table, etc.).
    /// Persistent failures: wrong Session pooler host/port (Supabase Connect), IPv6 (PreferIpv4), or missing migration.
    /// </summary>
    private static bool IsTransientPostgresReadFailure(Exception ex)
    {
        if (ex is IOException or SocketException)
            return true;
        return ex.InnerException != null && IsTransientPostgresReadFailure(ex.InnerException);
    }

    private async Task<IReadOnlyList<SubscriptionFeatureGateDto>> LoadAllFromDbOnceAsync(CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT feature_key, requires_premium, minimum_plan, label, sort_order, updated_at
            FROM public.subscription_feature_gates
            ORDER BY sort_order, feature_key
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        var list = new List<SubscriptionFeatureGateDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(new SubscriptionFeatureGateDto
            {
                FeatureKey = reader.GetString(0),
                RequiresPremium = reader.GetBoolean(1),
                MinimumPlan = reader.IsDBNull(2) ? SubscriptionPlans.Free : reader.GetString(2),
                Label = reader.GetString(3),
                SortOrder = reader.GetInt32(4),
                UpdatedAt = reader.GetFieldValue<DateTimeOffset>(5),
            });
        }

        return list;
    }

    /// <inheritdoc />
    public async Task<string> GetMinimumPlanForFeatureAsync(string featureKey, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(featureKey))
            return SubscriptionPlans.Free;

        var all = await GetAllAsync(cancellationToken);
        foreach (var row in all)
        {
            if (string.Equals(row.FeatureKey, featureKey, StringComparison.Ordinal))
                return row.MinimumPlan;
        }

        return SubscriptionPlans.Free;
    }

    /// <inheritdoc />
    public async Task<bool> TryUpdateMinimumPlanAsync(string featureKey, string minimumPlan, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(featureKey))
            return false;

        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");

        const string sql = """
            UPDATE public.subscription_feature_gates
            SET minimum_plan = @minimumPlan,
                requires_premium = (@minimumPlan <> 'free'),
                updated_at = now()
            WHERE feature_key = @featureKey
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("featureKey", featureKey);
        cmd.Parameters.AddWithValue("minimumPlan", minimumPlan);
        var n = await cmd.ExecuteNonQueryAsync(cancellationToken);
        if (n > 0)
            _cache.Remove(CacheKey);

        return n > 0;
    }

    /// <inheritdoc />
    public async Task<bool> IsPremiumRequiredForFeatureAsync(string featureKey, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(featureKey))
            return false;

        var all = await GetAllAsync(cancellationToken);
        foreach (var row in all)
        {
            if (string.Equals(row.FeatureKey, featureKey, StringComparison.Ordinal))
                return row.RequiresPremium;
        }

        return false;
    }

    /// <inheritdoc />
    public async Task<bool> TryUpdateRequiresPremiumAsync(string featureKey, bool requiresPremium, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(featureKey))
            return false;

        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");

        const string sql = """
            UPDATE public.subscription_feature_gates
            SET requires_premium = @requiresPremium,
                updated_at = now()
            WHERE feature_key = @featureKey
            """;

        const int maxAttempts = 3;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await using var conn = CreateConnection();
                await conn.OpenAsync(cancellationToken);
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("featureKey", featureKey);
                cmd.Parameters.AddWithValue("requiresPremium", requiresPremium);
                var n = await cmd.ExecuteNonQueryAsync(cancellationToken);
                if (n > 0)
                    _cache.Remove(CacheKey);

                return n > 0;
            }
            catch (Exception ex) when (IsTransientPostgresReadFailure(ex))
            {
                if (attempt >= maxAttempts)
                    throw;

                _logger.LogWarning(
                    ex,
                    "subscription_feature_gates update attempt {Attempt}/{Max} failed (transient); retrying",
                    attempt,
                    maxAttempts);
                await Task.Delay(TimeSpan.FromMilliseconds(100 * attempt), cancellationToken);
            }
        }

        throw new InvalidOperationException("subscription_feature_gates update failed after retries");
    }
}
