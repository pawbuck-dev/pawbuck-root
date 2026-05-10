using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public class SupportProcessedEmailsService : ISupportProcessedEmailsService
{
    public const string ErrorAttachmentNotStored = "ATTACHMENT_NOT_STORED";
    public const string ErrorNoAttachments = "NO_ATTACHMENTS";
    public const string ErrorNotFailure = "NOT_FAILURE_ROW";
    public const string ErrorInvalidIndex = "INVALID_ATTACHMENT_INDEX";
    public const string ErrorStorageNotConfigured = "STORAGE_NOT_CONFIGURED";
    public const string ErrorAttachmentBodyNotArchived = "ATTACHMENT_BODY_NOT_ARCHIVED";

    private const int SnippetMaxChars = 160;
    private const int MinTtlSeconds = 60;
    private const int MaxTtlSeconds = 600;
    private const int DefaultPageSize = 25;
    private const int MaxPageSize = 100;
    private const string PendingEmailsBucket = "pending-emails";
    private const string PetsBucket = "pets";
    private const string SupportPreviewPrefix = "support-preview";

    private static readonly JsonSerializerOptions PendingEmailJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly IOptions<SupabaseOptions> _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SupportProcessedEmailsService> _logger;

    public SupportProcessedEmailsService(
        IOptions<SupabaseOptions> options,
        IHttpClientFactory httpClientFactory,
        ILogger<SupportProcessedEmailsService> logger)
    {
        _options = options;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private NpgsqlConnection CreateConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured");
        return new NpgsqlConnection(cs);
    }

    private bool IsSupabaseStorageConfigured()
    {
        var url = _options.Value.Url?.Trim();
        var serviceKey = _options.Value.ServiceRoleKey?.Trim();
        return !string.IsNullOrEmpty(url) && !string.IsNullOrEmpty(serviceKey);
    }

    /// <inheritdoc />
    public async Task<SupportProcessedEmailsListResponse> ListAsync(
        SupportProcessedEmailsListQuery query,
        CancellationToken cancellationToken = default)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize <= 0 ? DefaultPageSize : query.PageSize, 1, MaxPageSize);
        var offset = (page - 1) * pageSize;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        var (whereSql, parameters) = BuildListFilter(query);
        var countSql = $"""
            SELECT COUNT(*)
            FROM public.processed_emails pe
            LEFT JOIN public.pets p ON p.id = pe.pet_id AND p.deleted_at IS NULL
            LEFT JOIN auth.users u ON u.id = p.user_id
            WHERE {whereSql}
            """;

        int total;
        await using (var countCmd = new NpgsqlCommand(countSql, conn))
        {
            foreach (var (name, value) in parameters)
                countCmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
            var scalar = await countCmd.ExecuteScalarAsync(cancellationToken);
            total = scalar is long l ? (int)l : Convert.ToInt32(scalar ?? 0);
        }

        var listSql = $"""
            SELECT
              pe.id,
              pe.s3_key,
              pe.pet_id,
              p.name,
              u.email,
              pe.status,
              pe.started_at,
              pe.completed_at,
              pe.attachment_count,
              pe.success,
              pe.sender_email,
              pe.subject,
              pe.document_type,
              pe.failure_reason,
              pe.review_status
            FROM public.processed_emails pe
            LEFT JOIN public.pets p ON p.id = pe.pet_id AND p.deleted_at IS NULL
            LEFT JOIN auth.users u ON u.id = p.user_id
            WHERE {whereSql}
            ORDER BY pe.completed_at DESC NULLS LAST
            LIMIT @pageSize OFFSET @offset
            """;

        var items = new List<SupportProcessedEmailListItemDto>();
        await using (var cmd = new NpgsqlCommand(listSql, conn))
        {
            foreach (var (name, value) in parameters)
                cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
            cmd.Parameters.AddWithValue("pageSize", pageSize);
            cmd.Parameters.AddWithValue("offset", offset);

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var failureReason = reader.IsDBNull(13) ? null : reader.GetString(13);
                items.Add(new SupportProcessedEmailListItemDto
                {
                    Id = reader.GetGuid(0),
                    S3Key = reader.GetString(1),
                    PetId = reader.IsDBNull(2) ? null : reader.GetGuid(2),
                    PetName = reader.IsDBNull(3) ? null : reader.GetString(3),
                    OwnerEmail = reader.IsDBNull(4) ? null : reader.GetString(4),
                    Status = reader.GetString(5),
                    StartedAt = reader.IsDBNull(6) ? null : reader.GetFieldValue<DateTimeOffset>(6),
                    CompletedAt = reader.IsDBNull(7) ? null : reader.GetFieldValue<DateTimeOffset>(7),
                    AttachmentCount = reader.IsDBNull(8) ? null : reader.GetInt32(8),
                    Success = reader.IsDBNull(9) ? null : reader.GetBoolean(9),
                    SenderEmail = reader.IsDBNull(10) ? null : reader.GetString(10),
                    Subject = reader.IsDBNull(11) ? null : reader.GetString(11),
                    DocumentType = reader.IsDBNull(12) ? null : reader.GetString(12),
                    FailureReason = failureReason,
                    FailureReasonSnippet = Snippet(failureReason),
                    ReviewStatus = reader.IsDBNull(14) ? null : reader.GetString(14),
                });
            }
        }

        return new SupportProcessedEmailsListResponse
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    /// <inheritdoc />
    public async Task<SupportProcessedEmailDetailDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        const string sql = """
            SELECT
              pe.id,
              pe.s3_key,
              pe.pet_id,
              p.name,
              u.email,
              pe.status,
              pe.started_at,
              pe.completed_at,
              pe.attachment_count,
              pe.success,
              pe.sender_email,
              pe.subject,
              pe.document_type,
              pe.failure_reason,
              pe.review_status
            FROM public.processed_emails pe
            LEFT JOIN public.pets p ON p.id = pe.pet_id AND p.deleted_at IS NULL
            LEFT JOIN auth.users u ON u.id = p.user_id
            WHERE pe.id = @id
            LIMIT 1
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("id", id);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        var failureReason = reader.IsDBNull(13) ? null : reader.GetString(13);
        return new SupportProcessedEmailDetailDto
        {
            Id = reader.GetGuid(0),
            S3Key = reader.GetString(1),
            PetId = reader.IsDBNull(2) ? null : reader.GetGuid(2),
            PetName = reader.IsDBNull(3) ? null : reader.GetString(3),
            OwnerEmail = reader.IsDBNull(4) ? null : reader.GetString(4),
            Status = reader.GetString(5),
            StartedAt = reader.IsDBNull(6) ? null : reader.GetFieldValue<DateTimeOffset>(6),
            CompletedAt = reader.IsDBNull(7) ? null : reader.GetFieldValue<DateTimeOffset>(7),
            AttachmentCount = reader.IsDBNull(8) ? null : reader.GetInt32(8),
            Success = reader.IsDBNull(9) ? null : reader.GetBoolean(9),
            SenderEmail = reader.IsDBNull(10) ? null : reader.GetString(10),
            Subject = reader.IsDBNull(11) ? null : reader.GetString(11),
            DocumentType = reader.IsDBNull(12) ? null : reader.GetString(12),
            FailureReason = failureReason,
            FailureReasonSnippet = Snippet(failureReason),
            ReviewStatus = reader.IsDBNull(14) ? null : reader.GetString(14),
        };
    }

    /// <inheritdoc />
    public async Task<SupportProcessedEmailsSummaryResponse> GetSummaryAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default)
    {
        var toExclusive = to ?? DateTimeOffset.UtcNow;
        var fromInclusive = from ?? toExclusive.AddDays(-30);

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        const string sql = """
            SELECT COALESCE(pe.document_type, '') AS document_type, COUNT(*)::int AS cnt
            FROM public.processed_emails pe
            WHERE pe.status = 'completed'
              AND pe.success = false
              AND pe.completed_at >= @from
              AND pe.completed_at < @to
            GROUP BY COALESCE(pe.document_type, '')
            ORDER BY cnt DESC, document_type
            """;

        var buckets = new List<SupportProcessedEmailsSummaryBucketDto>();
        await using (var cmd = new NpgsqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("from", fromInclusive);
            cmd.Parameters.AddWithValue("to", toExclusive);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                buckets.Add(new SupportProcessedEmailsSummaryBucketDto
                {
                    DocumentType = reader.GetString(0),
                    Count = reader.GetInt32(1),
                });
            }
        }

        var total = buckets.Sum(b => b.Count);
        return new SupportProcessedEmailsSummaryResponse
        {
            From = fromInclusive,
            To = toExclusive,
            TotalFailures = total,
            ByDocumentType = buckets,
        };
    }

    /// <inheritdoc />
    public async Task<SupportProcessedEmailAttachmentsResponse?> ListAttachmentsAsync(
        Guid processedEmailId,
        CancellationToken cancellationToken = default)
    {
        var row = await LoadAttachmentRowAsync(processedEmailId, cancellationToken);
        if (row is null)
            return null;

        if (row.Success != false)
        {
            return new SupportProcessedEmailAttachmentsResponse
            {
                ErrorCode = ErrorNotFailure,
                ErrorMessage = "Attachments are only exposed for failed processing rows (success = false).",
            };
        }

        if (!IsSupabaseStorageConfigured())
        {
            return new SupportProcessedEmailAttachmentsResponse
            {
                ErrorCode = ErrorStorageNotConfigured,
                ErrorMessage =
                    "PawBuck.API needs Supabase:Url and Supabase:ServiceRoleKey (or env SUPABASE_SERVICE_ROLE_KEY) to read pending-emails and stage previews. Add them to appsettings / the API host env and restart.",
            };
        }

        var parsed = await TryLoadPendingEmailAsync(row.S3Key, cancellationToken);
        if (parsed.ErrorCode != null)
        {
            return new SupportProcessedEmailAttachmentsResponse
            {
                ErrorCode = parsed.ErrorCode,
                ErrorMessage = parsed.ErrorMessage,
            };
        }

        var list = new List<SupportProcessedEmailAttachmentDto>();
        for (var i = 0; i < parsed.Attachments!.Count; i++)
        {
            var a = parsed.Attachments[i];
            list.Add(new SupportProcessedEmailAttachmentDto
            {
                Index = i,
                Filename = a.Filename ?? $"attachment-{i}",
                MimeType = string.IsNullOrWhiteSpace(a.MimeType) ? "application/octet-stream" : a.MimeType.Trim(),
                Size = a.Size,
            });
        }

        if (list.Count == 0)
        {
            return new SupportProcessedEmailAttachmentsResponse
            {
                ErrorCode = ErrorNoAttachments,
                ErrorMessage = "No attachments found in stored email JSON.",
            };
        }

        var metadataOnly = parsed.Attachments!.Any(a => a.ContentWasStrippedForArchive == true);

        return new SupportProcessedEmailAttachmentsResponse
        {
            Attachments = list,
            WarningMessage = metadataOnly
                ? "This archive was stored without attachment bodies (payload size limit). Filenames are listed; Open is not available for these files."
                : null,
        };
    }

    /// <inheritdoc />
    public async Task<SupportProcessedEmailSignedUrlResponse?> GetAttachmentSignedUrlAsync(
        Guid processedEmailId,
        int index,
        int ttlSeconds,
        CancellationToken cancellationToken = default)
    {
        var row = await LoadAttachmentRowAsync(processedEmailId, cancellationToken);
        if (row is null)
            return null;

        if (row.Success != false)
        {
            return new SupportProcessedEmailSignedUrlResponse
            {
                ErrorCode = ErrorNotFailure,
                ErrorMessage = "Signed URLs are only available for failed processing rows (success = false).",
            };
        }

        if (!IsSupabaseStorageConfigured())
        {
            return new SupportProcessedEmailSignedUrlResponse
            {
                ErrorCode = ErrorStorageNotConfigured,
                ErrorMessage =
                    "PawBuck.API needs Supabase:Url and Supabase:ServiceRoleKey (or env SUPABASE_SERVICE_ROLE_KEY) to read pending-emails and stage previews. Add them to appsettings / the API host env and restart.",
            };
        }

        var parsed = await TryLoadPendingEmailAsync(row.S3Key, cancellationToken);
        if (parsed.ErrorCode != null)
        {
            return new SupportProcessedEmailSignedUrlResponse
            {
                ErrorCode = parsed.ErrorCode,
                ErrorMessage = parsed.ErrorMessage,
            };
        }

        var attachments = parsed.Attachments!;
        if (index < 0 || index >= attachments.Count)
        {
            return new SupportProcessedEmailSignedUrlResponse
            {
                ErrorCode = ErrorInvalidIndex,
                ErrorMessage = $"Attachment index must be between 0 and {attachments.Count - 1}.",
            };
        }

        var att = attachments[index];
        if (att.ContentWasStrippedForArchive == true || string.IsNullOrWhiteSpace(att.Content))
        {
            return new SupportProcessedEmailSignedUrlResponse
            {
                ErrorCode = ErrorAttachmentBodyNotArchived,
                ErrorMessage =
                    "This attachment was not retained in the pending-emails archive (size cap or metadata-only snapshot). Open is not available.",
            };
        }

        byte[] bytes;
        try
        {
            bytes = DecodeBase64Content(att.Content);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Base64 decode failed for processed email {Id} attachment {Index}", processedEmailId, index);
            return new SupportProcessedEmailSignedUrlResponse
            {
                ErrorCode = "ATTACHMENT_DECODE_FAILED",
                ErrorMessage = "Could not decode attachment content.",
            };
        }

        var ttl = Math.Clamp(ttlSeconds <= 0 ? 300 : ttlSeconds, MinTtlSeconds, MaxTtlSeconds);
        var filename = string.IsNullOrWhiteSpace(att.Filename) ? $"file-{index}" : att.Filename.Trim();
        var safeName = SanitizeFileNameForPath(filename);
        var mime = string.IsNullOrWhiteSpace(att.MimeType) ? "application/octet-stream" : att.MimeType.Trim();
        var previewPath = $"{SupportPreviewPrefix}/{processedEmailId:N}/{index}/{safeName}";

        try
        {
            await UploadObjectAsync(previewPath, bytes, mime, cancellationToken);
            var signedUrl = await CreateSignedUrlAsync(previewPath, ttl, cancellationToken);
            return new SupportProcessedEmailSignedUrlResponse
            {
                SignedUrl = signedUrl,
                Filename = filename,
                MimeType = mime,
                PreviewPath = previewPath,
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Storage upload or sign failed for processed email {Id}", processedEmailId);
            return new SupportProcessedEmailSignedUrlResponse
            {
                ErrorCode = "STORAGE_ERROR",
                ErrorMessage = "Could not stage attachment for preview.",
            };
        }
    }

    private sealed class AttachmentRowState
    {
        public string S3Key { get; init; } = "";
        public bool? Success { get; init; }
    }

    private async Task<AttachmentRowState?> LoadAttachmentRowAsync(Guid id, CancellationToken cancellationToken)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT pe.s3_key, pe.success
            FROM public.processed_emails pe
            WHERE pe.id = @id
            LIMIT 1
            """,
            conn);
        cmd.Parameters.AddWithValue("id", id);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return new AttachmentRowState
        {
            S3Key = reader.GetString(0),
            Success = reader.IsDBNull(1) ? null : reader.GetBoolean(1),
        };
    }

    private sealed class PendingEmailParseResult
    {
        public List<PendingAttachmentJson>? Attachments { get; init; }
        public string? ErrorCode { get; init; }
        public string? ErrorMessage { get; init; }
    }

    private sealed class PendingAttachmentJson
    {
        [JsonPropertyName("filename")]
        public string? Filename { get; set; }

        [JsonPropertyName("mimeType")]
        public string? MimeType { get; set; }

        [JsonPropertyName("size")]
        public long Size { get; set; }

        [JsonPropertyName("content")]
        public string? Content { get; set; }

        [JsonPropertyName("contentWasStrippedForArchive")]
        public bool? ContentWasStrippedForArchive { get; set; }
    }

    private sealed class PendingEmailRootJson
    {
        [JsonPropertyName("attachments")]
        public List<PendingAttachmentJson>? Attachments { get; set; }
    }

    private async Task<PendingEmailParseResult> TryLoadPendingEmailAsync(string s3Key, CancellationToken cancellationToken)
    {
        byte[] jsonBytes;
        try
        {
            jsonBytes = await DownloadPendingEmailJsonBytesAsync(s3Key, cancellationToken);
        }
        catch (HttpRequestException)
        {
            return new PendingEmailParseResult
            {
                ErrorCode = ErrorAttachmentNotStored,
                ErrorMessage =
                    "No JSON file in the pending-emails bucket for this Message-Id. Common causes: (1) Mailgun Edge failed to upload the failure archive (check function logs), (2) PawBuck.API Supabase:Url points at a different project than the database, (3) object was deleted, (4) email was processed before failure-archive logic existed.",
            };
        }

        PendingEmailRootJson? root;
        try
        {
            root = JsonSerializer.Deserialize<PendingEmailRootJson>(jsonBytes, PendingEmailJsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse pending email JSON");
            return new PendingEmailParseResult
            {
                ErrorCode = "INVALID_STORED_EMAIL",
                ErrorMessage = "Stored email JSON could not be parsed.",
            };
        }

        var attachments = root?.Attachments ?? new List<PendingAttachmentJson>();
        return new PendingEmailParseResult { Attachments = attachments };
    }

    private async Task<byte[]> DownloadPendingEmailJsonBytesAsync(string s3Key, CancellationToken cancellationToken)
    {
        var supabaseUrl = _options.Value.Url?.Trim();
        var serviceKey = _options.Value.ServiceRoleKey?.Trim();
        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(serviceKey))
            throw new InvalidOperationException("Supabase Url and ServiceRoleKey are required for attachment preview.");

        var objectPath = $"{SanitizeS3Key(s3Key)}.json";
        return await DownloadStorageObjectAsync(supabaseUrl, PendingEmailsBucket, objectPath, serviceKey, cancellationToken);
    }

    private async Task UploadObjectAsync(string objectPath, byte[] bytes, string contentType, CancellationToken cancellationToken)
    {
        var supabaseUrl = _options.Value.Url?.Trim();
        var serviceKey = _options.Value.ServiceRoleKey?.Trim();
        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(serviceKey))
            throw new InvalidOperationException("Supabase Url and ServiceRoleKey are required for attachment preview.");

        var encoded = EncodeStoragePathSegments(objectPath);
        var url = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/{Uri.EscapeDataString(PetsBucket)}/{encoded}?upsert=true";

        var client = _httpClientFactory.CreateClient("DocumentImageDownload");
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", serviceKey);
        req.Content = new ByteArrayContent(bytes);
        if (!MediaTypeHeaderValue.TryParse(contentType, out var mt))
            mt = new MediaTypeHeaderValue("application/octet-stream");
        req.Content.Headers.ContentType = mt;

        using var response = await client.SendAsync(req, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Storage upload failed {Status}: {Body}", response.StatusCode, body);
            response.EnsureSuccessStatusCode();
        }
    }

    private async Task<string> CreateSignedUrlAsync(string objectPath, int ttlSeconds, CancellationToken cancellationToken)
    {
        var supabaseUrl = _options.Value.Url?.Trim();
        var serviceKey = _options.Value.ServiceRoleKey?.Trim();
        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(serviceKey))
            throw new InvalidOperationException("Supabase Url and ServiceRoleKey are required for attachment preview.");

        var encoded = EncodeStoragePathSegments(objectPath);
        var url = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/sign/{Uri.EscapeDataString(PetsBucket)}/{encoded}";

        var client = _httpClientFactory.CreateClient("DocumentImageDownload");
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", serviceKey);
        req.Content = new StringContent(
            $"{{\"expiresIn\":{ttlSeconds}}}",
            Encoding.UTF8,
            "application/json");

        using var response = await client.SendAsync(req, cancellationToken);
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Storage sign failed {Status}: {Body}", response.StatusCode, json);
            response.EnsureSuccessStatusCode();
        }

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (root.TryGetProperty("signedURL", out var p1))
        {
            var s = p1.GetString();
            if (!string.IsNullOrEmpty(s))
                return NormalizeSignedUrl(supabaseUrl, s);
        }

        if (root.TryGetProperty("signedUrl", out var p2))
        {
            var s = p2.GetString();
            if (!string.IsNullOrEmpty(s))
                return NormalizeSignedUrl(supabaseUrl, s);
        }

        throw new InvalidOperationException("Signed URL response missing signedURL.");
    }

    private static string NormalizeSignedUrl(string supabaseUrl, string signedFromApi)
    {
        if (signedFromApi.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            signedFromApi.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return signedFromApi;

        // Relative path e.g. /object/sign/...
        return $"{supabaseUrl.TrimEnd('/')}{signedFromApi}";
    }

    private async Task<byte[]> DownloadStorageObjectAsync(
        string supabaseUrl,
        string bucket,
        string objectPath,
        string bearerToken,
        CancellationToken cancellationToken)
    {
        var encoded = EncodeStoragePathSegments(objectPath);
        var url = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/{Uri.EscapeDataString(bucket)}/{encoded}";

        var client = _httpClientFactory.CreateClient("DocumentImageDownload");
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken.Trim());
        using var response = await client.SendAsync(req, cancellationToken);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            throw new HttpRequestException("Not found", null, response.StatusCode);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException($"Storage download failed: {(int)response.StatusCode} {body}");
        }

        return await response.Content.ReadAsByteArrayAsync(cancellationToken);
    }

    private static string EncodeStoragePathSegments(string objectPath)
    {
        return string.Join(
            "/",
            objectPath.Split('/', StringSplitOptions.RemoveEmptyEntries).Select(Uri.EscapeDataString));
    }

    private static string SanitizeS3Key(string s3Key)
    {
        var trimmed = s3Key.Replace("<", "", StringComparison.Ordinal).Replace(">", "", StringComparison.Ordinal);
        var sb = new StringBuilder(trimmed.Length);
        foreach (var c in trimmed)
        {
            if (char.IsAsciiLetterOrDigit(c) || c is '.' or '_' or '@' or '-')
                sb.Append(c);
            else
                sb.Append('_');
        }

        return sb.ToString();
    }

    private static string SanitizeFileNameForPath(string filename)
    {
        var name = Path.GetFileName(filename);
        if (string.IsNullOrEmpty(name))
            name = "attachment.bin";
        var sb = new StringBuilder(name.Length);
        foreach (var c in name)
        {
            if (char.IsAsciiLetterOrDigit(c) || c is '.' or '_' or '-')
                sb.Append(c);
            else
                sb.Append('_');
        }

        var s = sb.ToString();
        return s.Length > 120 ? s[..120] : s;
    }

    private static byte[] DecodeBase64Content(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new FormatException("Empty attachment content.");

        var b64 = content.Trim();
        var comma = b64.IndexOf(',', StringComparison.Ordinal);
        if (comma >= 0 && b64[..comma].Contains("base64", StringComparison.OrdinalIgnoreCase))
            b64 = b64[(comma + 1)..];

        return Convert.FromBase64String(b64);
    }

    private static string? Snippet(string? failureReason)
    {
        if (string.IsNullOrEmpty(failureReason))
            return null;
        return failureReason.Length <= SnippetMaxChars
            ? failureReason
            : failureReason[..SnippetMaxChars] + "…";
    }

    private static (string WhereSql, List<(string Name, object? Value)> Parameters) BuildListFilter(SupportProcessedEmailsListQuery query)
    {
        var parts = new List<string> { "pe.status = 'completed'" };
        var parameters = new List<(string Name, object? Value)>();

        if (query.FailuresOnly)
            parts.Add("pe.success = false");

        if (query.From is { } from)
        {
            parts.Add("pe.completed_at >= @from");
            parameters.Add(("from", from));
        }

        if (query.To is { } to)
        {
            parts.Add("pe.completed_at < @to");
            parameters.Add(("to", to));
        }

        var docType = (query.DocumentType ?? "").Trim();
        if (docType.Length > 0 && !docType.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            parts.Add("pe.document_type = @documentType");
            parameters.Add(("documentType", docType));
        }

        var review = (query.ReviewStatus ?? "").Trim();
        if (review.Length > 0 && !review.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            parts.Add("pe.review_status = @reviewStatus");
            parameters.Add(("reviewStatus", review));
        }

        var q = (query.Q ?? "").Trim();
        if (q.Length > 0)
        {
            var escaped = EscapeForLike(q);
            parts.Add(
                """
                (pe.failure_reason ILIKE @qLike ESCAPE '\' OR pe.subject ILIKE @qLike ESCAPE '\')
                """);
            parameters.Add(("qLike", "%" + escaped + "%"));
        }

        return (string.Join(" AND ", parts), parameters);
    }

    private static string EscapeForLike(string value)
    {
        return value.Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
    }
}
