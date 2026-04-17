using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;
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

    public SubscriptionFeatureGateService(IOptions<SupabaseOptions> options, IMemoryCache cache)
    {
        _options = options;
        _cache = cache;
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
        const string sql = """
            SELECT feature_key, requires_premium, label, sort_order, updated_at
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
                Label = reader.GetString(2),
                SortOrder = reader.GetInt32(3),
                UpdatedAt = reader.GetFieldValue<DateTimeOffset>(4),
            });
        }

        return list;
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
}
