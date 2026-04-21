using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface IMiloJournalConfigAdminService
{
    Task<MiloJournalConfigSnapshot> GetAsync(CancellationToken cancellationToken = default);
    Task SaveAsync(MiloJournalConfigSnapshot config, CancellationToken cancellationToken = default);
}

public sealed class MiloJournalConfigAdminService : IMiloJournalConfigAdminService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = false };

    private readonly IOptions<SupabaseOptions> _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<MiloJournalConfigAdminService> _logger;

    public MiloJournalConfigAdminService(
        IOptions<SupabaseOptions> options,
        IMemoryCache cache,
        ILogger<MiloJournalConfigAdminService> logger)
    {
        _options = options;
        _cache = cache;
        _logger = logger;
    }

    public async Task<MiloJournalConfigSnapshot> GetAsync(CancellationToken cancellationToken = default)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return MiloJournalConfigSnapshot.Defaults();

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

        var partial = JsonSerializer.Deserialize<MiloJournalConfigSnapshot>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        return MiloJournalConfigSnapshot.Merge(partial);
    }

    public async Task SaveAsync(MiloJournalConfigSnapshot config, CancellationToken cancellationToken = default)
    {
        var merged = MiloJournalConfigSnapshot.Merge(config);
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured.");

        var json = JsonSerializer.Serialize(merged, JsonOptions);
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            INSERT INTO public.milo_journal_config (id, config, updated_at)
            VALUES (@id, @config::jsonb, timezone('utc', now()))
            ON CONFLICT (id) DO UPDATE SET
              config = EXCLUDED.config,
              updated_at = timezone('utc', now())
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("id", MiloJournalConfigSnapshot.DefaultId);
        cmd.Parameters.AddWithValue("config", json);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
        MiloJournalConfigProvider.InvalidateCache(_cache);
        _logger.LogInformation("milo_journal_config updated");
    }
}
