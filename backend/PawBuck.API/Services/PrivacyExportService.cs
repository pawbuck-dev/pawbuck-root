using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Configuration;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class PrivacyExportService : IPrivacyExportService
{
    public const string BundleVersion = "pawbuck-export-1";

    private static readonly string[] UserTables =
    [
        "user_preferences",
        "user_entitlements",
        "user_subscription_usage",
        "push_tokens",
        "analytics_events",
        "pet_email_list",
        "household_members",
        "household_invites",
    ];

    private static readonly string[] PetTables =
    [
        "vaccinations",
        "medicines",
        "medication_doses",
        "clinical_exams",
        "lab_results",
        "daily_intake",
        "pet_weight_logs",
        "pet_behavior_baselines",
        "pet_journal_entries",
        "pet_allergies",
        "pet_conditions",
        "vet_bookings",
        "message_threads",
    ];

    private static readonly string[] UserOrPetTables =
    [
        "walk_sessions",
        "milo_journal_chat_turns",
        "journal_interview_sessions",
    ];

    private readonly IOptions<SupabaseOptions> _supabase;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PrivacyExportService> _logger;

    public PrivacyExportService(
        IOptions<SupabaseOptions> supabase,
        IHttpClientFactory httpClientFactory,
        ILogger<PrivacyExportService> logger)
    {
        _supabase = supabase;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public IReadOnlyList<string> ExportTableNames =>
        UserTables.Concat(PetTables).Concat(UserOrPetTables).Append("pets").Append("pet_documents").Append("thread_messages").ToList();

    public async Task<PrivacyExportBundle> BuildBundleAsync(Guid userId, CancellationToken cancellationToken)
    {
        var sections = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["account"] = new { userId = userId.ToString("D") },
        };

        var cs = RequireConnectionString();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        var petIds = await LoadPetIdsAsync(conn, userId, cancellationToken);

        foreach (var table in UserTables)
        {
            sections[table] = await QueryUserScopedAsync(conn, table, userId, cancellationToken);
        }

        foreach (var table in PetTables)
        {
            sections[table] = await QueryPetScopedAsync(conn, table, petIds, cancellationToken);
        }

        sections["pets"] = await QueryUserScopedAsync(conn, "pets", userId, cancellationToken);

        foreach (var table in UserOrPetTables)
        {
            sections[table] = await QueryUserOrPetScopedAsync(conn, table, userId, petIds, cancellationToken);
        }

        sections["thread_messages"] = await QueryThreadMessagesAsync(conn, petIds, cancellationToken);
        sections["pet_documents"] = await QueryPetDocumentsWithSignedUrlsAsync(
            conn,
            userId,
            petIds,
            cancellationToken);

        return new PrivacyExportBundle(
            BundleVersion,
            DateTimeOffset.UtcNow,
            userId,
            sections);
    }

    public async Task<Guid> QueueExportAsync(Guid userId, CancellationToken cancellationToken)
    {
        var cs = RequireConnectionString();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.data_export_requests (user_id, status)
            VALUES (@uid, 'queued')
            RETURNING id
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        var id = (Guid)(await cmd.ExecuteScalarAsync(cancellationToken) ?? throw new InvalidOperationException("insert failed"));
        return id;
    }

    public async Task<DataExportRequestRow?> GetLatestStatusAsync(Guid userId, CancellationToken cancellationToken)
    {
        var cs = RequireConnectionString();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT id, user_id, status, file_path, expires_at, created_at
            FROM public.data_export_requests
            WHERE user_id = @uid
            ORDER BY created_at DESC
            LIMIT 1
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return MapExportRow(reader);
    }

    public async Task<IReadOnlyList<DataExportRequestRow>> GetQueuedRequestsAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var cs = RequireConnectionString();
        var rows = new List<DataExportRequestRow>();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT id, user_id, status, file_path, expires_at, created_at
            FROM public.data_export_requests
            WHERE status = 'queued'
            ORDER BY created_at ASC
            LIMIT @limit
            """,
            conn);
        cmd.Parameters.AddWithValue("limit", Math.Clamp(limit, 1, 50));

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            rows.Add(MapExportRow(reader));

        return rows;
    }

    public async Task MarkRunningAsync(Guid requestId, CancellationToken cancellationToken)
    {
        await UpdateStatusAsync(requestId, "running", null, null, null, cancellationToken);
    }

    public async Task MarkReadyAsync(
        Guid requestId,
        string filePath,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken)
    {
        await UpdateStatusAsync(requestId, "ready", filePath, expiresAt, null, cancellationToken);
    }

    public async Task MarkFailedAsync(Guid requestId, string error, CancellationToken cancellationToken)
    {
        await UpdateStatusAsync(requestId, "failed", null, null, error, cancellationToken);
    }

    private static DataExportRequestRow MapExportRow(NpgsqlDataReader reader) =>
        new(
            reader.GetGuid(0),
            reader.GetGuid(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.IsDBNull(4) ? null : reader.GetFieldValue<DateTimeOffset>(4),
            reader.GetFieldValue<DateTimeOffset>(5));

    private async Task UpdateStatusAsync(
        Guid requestId,
        string status,
        string? filePath,
        DateTimeOffset? expiresAt,
        string? error,
        CancellationToken cancellationToken)
    {
        var cs = RequireConnectionString();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            UPDATE public.data_export_requests
            SET status = @status,
                file_path = COALESCE(@path, file_path),
                expires_at = COALESCE(@expires, expires_at),
                error_message = COALESCE(@error, error_message),
                updated_at = timezone('utc', now())
            WHERE id = @id
            """,
            conn);
        cmd.Parameters.AddWithValue("status", status);
        cmd.Parameters.AddWithValue("path", (object?)filePath ?? DBNull.Value);
        cmd.Parameters.AddWithValue("expires", (object?)expiresAt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("error", (object?)error ?? DBNull.Value);
        cmd.Parameters.AddWithValue("id", requestId);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<List<Guid>> LoadPetIdsAsync(
        NpgsqlConnection conn,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var ids = new List<Guid>();
        await using var cmd = new NpgsqlCommand(
            "SELECT id FROM public.pets WHERE user_id = @uid",
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            ids.Add(reader.GetGuid(0));
        return ids;
    }

    private static async Task<List<Dictionary<string, object?>>> QueryUserScopedAsync(
        NpgsqlConnection conn,
        string table,
        Guid userId,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            $"SELECT row_to_json(t) FROM public.{table} t WHERE user_id = @uid",
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        return await ReadJsonRowsAsync(cmd, cancellationToken);
    }

    private static async Task<List<Dictionary<string, object?>>> QueryPetScopedAsync(
        NpgsqlConnection conn,
        string table,
        IReadOnlyList<Guid> petIds,
        CancellationToken cancellationToken)
    {
        if (petIds.Count == 0)
            return [];

        await using var cmd = new NpgsqlCommand(
            $"SELECT row_to_json(t) FROM public.{table} t WHERE pet_id = ANY(@pet_ids)",
            conn);
        cmd.Parameters.AddWithValue("pet_ids", petIds.ToArray());
        return await ReadJsonRowsAsync(cmd, cancellationToken);
    }

    private static async Task<List<Dictionary<string, object?>>> QueryUserOrPetScopedAsync(
        NpgsqlConnection conn,
        string table,
        Guid userId,
        IReadOnlyList<Guid> petIds,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            petIds.Count > 0
                ? $"SELECT row_to_json(t) FROM public.{table} t WHERE user_id = @uid OR pet_id = ANY(@pet_ids)"
                : $"SELECT row_to_json(t) FROM public.{table} t WHERE user_id = @uid",
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        if (petIds.Count > 0)
            cmd.Parameters.AddWithValue("pet_ids", petIds.ToArray());
        return await ReadJsonRowsAsync(cmd, cancellationToken);
    }

    private static async Task<List<Dictionary<string, object?>>> QueryThreadMessagesAsync(
        NpgsqlConnection conn,
        IReadOnlyList<Guid> petIds,
        CancellationToken cancellationToken)
    {
        if (petIds.Count == 0)
            return [];

        await using var cmd = new NpgsqlCommand(
            """
            SELECT row_to_json(m)
            FROM public.thread_messages m
            JOIN public.message_threads t ON t.id = m.thread_id
            WHERE t.pet_id = ANY(@pet_ids)
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_ids", petIds.ToArray());
        return await ReadJsonRowsAsync(cmd, cancellationToken);
    }

    private async Task<List<Dictionary<string, object?>>> QueryPetDocumentsWithSignedUrlsAsync(
        NpgsqlConnection conn,
        Guid userId,
        IReadOnlyList<Guid> petIds,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT id, pet_id, document_type::text, storage_path, mime_type, created_at
            FROM public.pet_documents
            WHERE user_id = @uid OR pet_id = ANY(@pet_ids)
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        cmd.Parameters.AddWithValue("pet_ids", petIds.ToArray());

        var rows = new List<Dictionary<string, object?>>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var path = reader.GetString(3);
            string? signedUrl = null;
            try
            {
                signedUrl = await CreateSignedUrlAsync("pet-documents", path, 3600, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Export signed URL failed for {Path}", path);
            }

            rows.Add(new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
            {
                ["id"] = reader.GetGuid(0).ToString("D"),
                ["pet_id"] = reader.GetGuid(1).ToString("D"),
                ["document_type"] = reader.GetString(2),
                ["storage_path"] = path,
                ["mime_type"] = reader.GetString(4),
                ["created_at"] = reader.GetFieldValue<DateTimeOffset>(5).ToString("O"),
                ["download_url"] = signedUrl,
            });
        }

        return rows;
    }

    private async Task<string> CreateSignedUrlAsync(
        string bucket,
        string objectPath,
        int ttlSeconds,
        CancellationToken cancellationToken)
    {
        var url = _supabase.Value.Url?.Trim();
        var key = _supabase.Value.ServiceRoleKey?.Trim();
        if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
            throw new InvalidOperationException("Supabase not configured for signed URLs.");

        var encoded = string.Join("/", objectPath.Split('/').Select(Uri.EscapeDataString));
        var signUrl =
            $"{url.TrimEnd('/')}/storage/v1/object/sign/{Uri.EscapeDataString(bucket)}/{encoded}";

        var client = _httpClientFactory.CreateClient("DocumentImageDownload");
        using var req = new HttpRequestMessage(HttpMethod.Post, signUrl);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        req.Content = new StringContent(
            $"{{\"expiresIn\":{ttlSeconds}}}",
            Encoding.UTF8,
            "application/json");

        using var response = await client.SendAsync(req, cancellationToken);
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (root.TryGetProperty("signedURL", out var p1) && p1.GetString() is { Length: > 0 } s1)
            return NormalizeSignedUrl(url, s1);
        if (root.TryGetProperty("signedUrl", out var p2) && p2.GetString() is { Length: > 0 } s2)
            return NormalizeSignedUrl(url, s2);
        throw new InvalidOperationException("Signed URL missing from storage response.");
    }

    private static string NormalizeSignedUrl(string supabaseUrl, string signed)
    {
        if (signed.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            return signed;
        return $"{supabaseUrl.TrimEnd('/')}/storage/v1{signed}";
    }

    private static async Task<List<Dictionary<string, object?>>> ReadJsonRowsAsync(
        NpgsqlCommand cmd,
        CancellationToken cancellationToken)
    {
        var rows = new List<Dictionary<string, object?>>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            if (reader.IsDBNull(0))
                continue;
            var json = reader.GetString(0);
            var dict = JsonSerializer.Deserialize<Dictionary<string, object?>>(json)
                       ?? new Dictionary<string, object?>();
            rows.Add(dict);
        }

        return rows;
    }

    private string RequireConnectionString()
    {
        var cs = _supabase.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Supabase ConnectionString is required for privacy export.");
        return cs;
    }
}
