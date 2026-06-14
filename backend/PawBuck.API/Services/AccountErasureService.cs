using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Configuration;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class AccountErasureService : IAccountErasureService
{
    private readonly IOptions<SupabaseOptions> _supabase;
    private readonly IOptions<AccountPurgeOptions> _purgeOptions;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AccountErasureService> _logger;

    public AccountErasureService(
        IOptions<SupabaseOptions> supabase,
        IOptions<AccountPurgeOptions> purgeOptions,
        IHttpClientFactory httpClientFactory,
        ILogger<AccountErasureService> logger)
    {
        _supabase = supabase;
        _purgeOptions = purgeOptions;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<IReadOnlyList<AccountDeletionRequestRow>> GetPastDueDeletionRequestsAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var cs = RequireConnectionString();
        var rows = new List<AccountDeletionRequestRow>();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT id, user_id, purge_after
            FROM public.account_deletion_requests
            WHERE status = 'pending' AND purge_after <= timezone('utc', now())
            ORDER BY purge_after ASC
            LIMIT @limit
            """,
            conn);
        cmd.Parameters.AddWithValue("limit", Math.Clamp(limit, 1, 100));

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new AccountDeletionRequestRow(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetFieldValue<DateTimeOffset>(2)));
        }

        return rows;
    }

    public async Task<AccountPurgeResult> PurgeUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        try
        {
            var documentPaths = await LoadPetDocumentStoragePathsAsync(userId, cancellationToken);
            var summary = await CallEraseUserDataAsync(userId, cancellationToken);
            await CleanupStorageAsync(userId, documentPaths, cancellationToken);
            await DeleteAuthUserAsync(userId, cancellationToken);
            await WriteAuditLogAsync(userId, success: true, summary, error: null, cancellationToken);

            _logger.LogInformation("Purged account {UserId}", userId);
            return new AccountPurgeResult(userId, true, summary, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to purge account {UserId}", userId);
            await WriteAuditLogAsync(userId, success: false, summary: null, error: ex.Message, cancellationToken);
            return new AccountPurgeResult(userId, false, null, ex.Message);
        }
    }

    private async Task<IReadOnlyList<string>> LoadPetDocumentStoragePathsAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var cs = RequireConnectionString();
        var paths = new List<string>();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            "SELECT storage_path FROM public.pet_documents WHERE user_id = @uid",
            conn);
        cmd.Parameters.AddWithValue("uid", userId);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var p = reader.GetString(0);
            if (!string.IsNullOrWhiteSpace(p))
                paths.Add(p.Trim());
        }

        return paths;
    }

    private async Task<IReadOnlyDictionary<string, long>> CallEraseUserDataAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var cs = RequireConnectionString();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            "SELECT public.erase_user_data(@uid)::text",
            conn);
        cmd.Parameters.AddWithValue("uid", userId);

        var json = (string?)await cmd.ExecuteScalarAsync(cancellationToken)
                   ?? "{}";

        var dict = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
        using var doc = JsonDocument.Parse(json);
        foreach (var prop in doc.RootElement.EnumerateObject())
        {
            if (prop.Value.ValueKind == JsonValueKind.Number && prop.Value.TryGetInt64(out var n))
                dict[prop.Name] = n;
        }

        return dict;
    }

    private async Task CleanupStorageAsync(
        Guid userId,
        IReadOnlyList<string> documentPaths,
        CancellationToken cancellationToken)
    {
        var opts = _purgeOptions.Value;
        var userPrefix = userId.ToString("D");

        foreach (var bucket in opts.UserPrefixBuckets ?? [])
        {
            if (string.IsNullOrWhiteSpace(bucket))
                continue;
            await RemoveStoragePrefixAsync(bucket.Trim(), userPrefix, cancellationToken);
        }

        var vaultBucket = opts.PetDocumentsBucket?.Trim();
        if (!string.IsNullOrEmpty(vaultBucket))
        {
            foreach (var path in documentPaths)
                await RemoveStorageObjectsAsync(vaultBucket, [path], cancellationToken);
            await RemoveStoragePrefixAsync(vaultBucket, userPrefix, cancellationToken);
        }
    }

    private async Task RemoveStoragePrefixAsync(
        string bucket,
        string prefix,
        CancellationToken cancellationToken)
    {
        var (url, key) = RequireSupabaseHttp();
        var client = _httpClientFactory.CreateClient("DocumentImageDownload");
        var toDelete = new List<string>();
        var stack = new Stack<string>();
        stack.Push(prefix.TrimEnd('/'));

        while (stack.Count > 0)
        {
            var folder = stack.Pop();
            var listUrl =
                $"{url}/storage/v1/object/list/{Uri.EscapeDataString(bucket)}";
            using var listReq = new HttpRequestMessage(HttpMethod.Post, listUrl);
            listReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
            listReq.Content = new StringContent(
                JsonSerializer.Serialize(new { prefix = folder, limit = 1000, offset = 0 }),
                Encoding.UTF8,
                "application/json");

            using var listResp = await client.SendAsync(listReq, cancellationToken);
            if (!listResp.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Storage list failed for bucket {Bucket} prefix {Prefix}: {Status}",
                    bucket,
                    folder,
                    listResp.StatusCode);
                continue;
            }

            var json = await listResp.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
                continue;

            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (!item.TryGetProperty("name", out var nameEl))
                    continue;
                var name = nameEl.GetString();
                if (string.IsNullOrEmpty(name))
                    continue;

                var fullPath = string.IsNullOrEmpty(folder) ? name : $"{folder}/{name}";
                var isFolder = item.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.Null;
                if (isFolder)
                    stack.Push(fullPath);
                else
                    toDelete.Add(fullPath);
            }
        }

        if (toDelete.Count > 0)
            await RemoveStorageObjectsAsync(bucket, toDelete, cancellationToken);
    }

    private async Task RemoveStorageObjectsAsync(
        string bucket,
        IReadOnlyList<string> paths,
        CancellationToken cancellationToken)
    {
        if (paths.Count == 0)
            return;

        var (url, key) = RequireSupabaseHttp();
        var client = _httpClientFactory.CreateClient("DocumentImageDownload");
        var deleteUrl = $"{url}/storage/v1/object/{Uri.EscapeDataString(bucket)}";
        using var req = new HttpRequestMessage(HttpMethod.Delete, deleteUrl);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        req.Content = new StringContent(
            JsonSerializer.Serialize(paths),
            Encoding.UTF8,
            "application/json");

        using var resp = await client.SendAsync(req, cancellationToken);
        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning(
                "Storage delete failed bucket {Bucket} count {Count}: {Status} {Body}",
                bucket,
                paths.Count,
                resp.StatusCode,
                body);
        }
    }

    private async Task DeleteAuthUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var (url, key) = RequireSupabaseHttp();
        var client = _httpClientFactory.CreateClient("DocumentImageDownload");
        var deleteUrl = $"{url}/auth/v1/admin/users/{userId:D}";
        using var req = new HttpRequestMessage(HttpMethod.Delete, deleteUrl);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        req.Headers.Add("apikey", key);

        using var resp = await client.SendAsync(req, cancellationToken);
        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync(cancellationToken);
            if (resp.StatusCode == System.Net.HttpStatusCode.NotFound)
                return;
            throw new InvalidOperationException($"Auth delete failed ({resp.StatusCode}): {body}");
        }
    }

    private async Task WriteAuditLogAsync(
        Guid userId,
        bool success,
        IReadOnlyDictionary<string, long>? summary,
        string? error,
        CancellationToken cancellationToken)
    {
        var cs = RequireConnectionString();
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(userId.ToString("D"))))
            .ToLowerInvariant();

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.account_deletion_log (user_id_hash, status, rows_summary, error_message)
            VALUES (@hash, @status, @summary::jsonb, @error)
            """,
            conn);
        cmd.Parameters.AddWithValue("hash", hash);
        cmd.Parameters.AddWithValue("status", success ? "success" : "failed");
        cmd.Parameters.AddWithValue(
            "summary",
            summary is null ? DBNull.Value : JsonSerializer.Serialize(summary));
        cmd.Parameters.AddWithValue("error", (object?)error ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private string RequireConnectionString()
    {
        var cs = _supabase.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Supabase ConnectionString is required for account purge.");
        return cs;
    }

    private (string Url, string Key) RequireSupabaseHttp()
    {
        var url = _supabase.Value.Url?.Trim();
        var key = _supabase.Value.ServiceRoleKey?.Trim();
        if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
            throw new InvalidOperationException("Supabase Url and ServiceRoleKey are required for account purge.");
        return (url.TrimEnd('/'), key);
    }
}
