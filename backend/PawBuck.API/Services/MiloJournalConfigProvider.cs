using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class MiloJournalConfigProvider : IMiloJournalConfigProvider
{
    private const string CacheKey = "milo_journal_config_v1";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(2);

    private readonly IOptions<SupabaseOptions> _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<MiloJournalConfigProvider> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public MiloJournalConfigProvider(
        IOptions<SupabaseOptions> options,
        IMemoryCache cache,
        ILogger<MiloJournalConfigProvider> logger)
    {
        _options = options;
        _cache = cache;
        _logger = logger;
    }

    public async Task<MiloJournalConfigSnapshot> GetAsync(CancellationToken cancellationToken = default)
    {
        if (_cache.TryGetValue(CacheKey, out MiloJournalConfigSnapshot? cached) && cached != null)
            return cached;

        var loaded = await LoadFromDatabaseAsync(cancellationToken);
        _cache.Set(CacheKey, loaded, CacheDuration);
        return loaded;
    }

    private async Task<MiloJournalConfigSnapshot> LoadFromDatabaseAsync(CancellationToken cancellationToken)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return MiloJournalConfigSnapshot.Defaults();

        try
        {
            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync(cancellationToken);
            const string sql = """
                SELECT config
                FROM public.milo_journal_config
                WHERE id = @id
                LIMIT 1
                """;
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("id", MiloJournalConfigSnapshot.DefaultId);
            var raw = await cmd.ExecuteScalarAsync(cancellationToken);
            if (raw is not string json || string.IsNullOrWhiteSpace(json))
                return MiloJournalConfigSnapshot.Defaults();

            var partial = JsonSerializer.Deserialize<MiloJournalConfigSnapshot>(json, JsonOptions);
            return MiloJournalConfigSnapshot.Merge(partial);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load milo_journal_config; using defaults");
            return MiloJournalConfigSnapshot.Defaults();
        }
    }

    public static void InvalidateCache(IMemoryCache cache) =>
        cache.Remove(CacheKey);
}
