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
    private readonly IMailgunEdgeReprocessService _edgeReprocess;
    private readonly ILogger<SupportProcessedEmailsService> _logger;

    public SupportProcessedEmailsService(
        IOptions<SupabaseOptions> options,
        IHttpClientFactory httpClientFactory,
        IMailgunEdgeReprocessService edgeReprocess,
        ILogger<SupportProcessedEmailsService> logger)
    {
        _options = options;
        _httpClientFactory = httpClientFactory;
        _edgeReprocess = edgeReprocess;
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
            ORDER BY COALESCE(pe.completed_at, pe.started_at) DESC NULLS LAST
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
        var reviewStatus = reader.IsDBNull(14) ? null : reader.GetString(14);
        var detail = new SupportProcessedEmailDetailDto
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
            ReviewStatus = reviewStatus,
        };

        await PopulateDiagnosticsAsync(detail, cancellationToken);
        return detail;
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

        const string reviewInboxSql = """
            SELECT COUNT(*)::int
            FROM public.processed_emails pe
            WHERE pe.status = 'completed'
              AND COALESCE(pe.review_status, 'pending') NOT IN ('dismissed', 'resolved')
              AND (pe.success = false OR NULLIF(trim(pe.failure_reason), '') IS NOT NULL)
              AND pe.completed_at >= @from
              AND pe.completed_at < @to
            """;

        const string stuckSql = """
            SELECT COUNT(*)::int
            FROM public.processed_emails pe
            WHERE pe.status = 'processing'
              AND COALESCE(pe.review_status, 'pending') NOT IN ('dismissed', 'resolved')
              AND pe.started_at >= @from
              AND pe.started_at < @to
            """;

        int reviewInboxCount;
        await using (var reviewCmd = new NpgsqlCommand(reviewInboxSql, conn))
        {
            reviewCmd.Parameters.AddWithValue("from", fromInclusive);
            reviewCmd.Parameters.AddWithValue("to", toExclusive);
            reviewInboxCount = Convert.ToInt32(await reviewCmd.ExecuteScalarAsync(cancellationToken) ?? 0);
        }

        int stuckCount;
        await using (var stuckCmd = new NpgsqlCommand(stuckSql, conn))
        {
            stuckCmd.Parameters.AddWithValue("from", fromInclusive);
            stuckCmd.Parameters.AddWithValue("to", toExclusive);
            stuckCount = Convert.ToInt32(await stuckCmd.ExecuteScalarAsync(cancellationToken) ?? 0);
        }

        return new SupportProcessedEmailsSummaryResponse
        {
            From = fromInclusive,
            To = toExclusive,
            TotalFailures = total,
            TotalReviewInboxCandidates = reviewInboxCount,
            TotalStuckProcessing = stuckCount,
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

    internal static (string WhereSql, List<(string Name, object? Value)> Parameters) BuildListFilter(
        SupportProcessedEmailsListQuery query)
    {
        var parts = new List<string>();
        var parameters = new List<(string Name, object? Value)>();

        if (query.ReviewInboxOnly)
        {
            parts.Add(
                """
                (
                  (pe.status = 'completed'
                    AND COALESCE(pe.review_status, 'pending') NOT IN ('dismissed', 'resolved')
                    AND (pe.success = false OR NULLIF(trim(pe.failure_reason), '') IS NOT NULL))
                  OR pe.status = 'processing'
                )
                """);
        }
        else
        {
            parts.Add("pe.status = 'completed'");
            if (query.FailuresOnly)
                parts.Add("pe.success = false");
        }

        if (query.From is { } from)
        {
            parts.Add(
                query.ReviewInboxOnly
                    ? "(pe.completed_at >= @from OR (pe.status = 'processing' AND pe.started_at >= @from))"
                    : "pe.completed_at >= @from");
            parameters.Add(("from", from));
        }

        if (query.To is { } to)
        {
            parts.Add(
                query.ReviewInboxOnly
                    ? "(pe.completed_at < @to OR (pe.status = 'processing' AND pe.started_at < @to) OR pe.completed_at IS NULL)"
                    : "pe.completed_at < @to");
            parameters.Add(("to", to));
        }

        var ownerEmail = (query.OwnerEmail ?? "").Trim();
        if (ownerEmail.Length > 0)
        {
            parts.Add("lower(u.email) = lower(@ownerEmail)");
            parameters.Add(("ownerEmail", ownerEmail));
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

    /// <inheritdoc />
    public async Task<SupportBulkClearReviewInboxResponse> BulkClearReviewInboxAsync(
        SupportBulkClearReviewInboxRequest request,
        CancellationToken cancellationToken = default)
    {
        var action = (request.Action ?? "dismiss").Trim().ToLowerInvariant();
        if (action is not ("dismiss" or "resolve"))
        {
            throw new ArgumentException("action must be 'dismiss' or 'resolve'");
        }

        var maxRows = Math.Clamp(request.MaxRows <= 0 ? 500 : request.MaxRows, 1, 5000);
        var (whereSql, parameters) = BuildReviewInboxClearFilter(request);

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        var countSql = $"""
            SELECT COUNT(*)
            FROM public.processed_emails pe
            LEFT JOIN public.pets p ON p.id = pe.pet_id AND p.deleted_at IS NULL
            LEFT JOIN auth.users u ON u.id = p.user_id
            WHERE {whereSql}
            """;

        int matchingCount;
        await using (var countCmd = new NpgsqlCommand(countSql, conn))
        {
            foreach (var (name, value) in parameters)
                countCmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
            var scalar = await countCmd.ExecuteScalarAsync(cancellationToken);
            matchingCount = scalar is long l ? (int)l : Convert.ToInt32(scalar ?? 0);
        }

        if (request.DryRun)
        {
            return new SupportBulkClearReviewInboxResponse
            {
                DryRun = true,
                Action = action,
                MatchingCount = matchingCount,
                UpdatedCount = 0,
                Message =
                    $"Dry run: {matchingCount} Review Inbox row(s) match. Re-send with dryRun=false to {action} up to {maxRows} row(s).",
            };
        }

        var setSql = action == "resolve"
            ? """
              review_status = 'resolved',
              failure_reason = NULL,
              success = TRUE
              """
            : """
              review_status = 'dismissed',
              success = FALSE
              """;

        var updateSql = $"""
            WITH candidates AS (
              SELECT pe.id
              FROM public.processed_emails pe
              LEFT JOIN public.pets p ON p.id = pe.pet_id AND p.deleted_at IS NULL
              LEFT JOIN auth.users u ON u.id = p.user_id
              WHERE {whereSql}
              ORDER BY pe.completed_at DESC NULLS LAST
              LIMIT @maxRows
            )
            UPDATE public.processed_emails pe
            SET {setSql}
            FROM candidates c
            WHERE pe.id = c.id
            """;

        int updatedCount;
        await using (var updateCmd = new NpgsqlCommand(updateSql, conn))
        {
            foreach (var (name, value) in parameters)
                updateCmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
            updateCmd.Parameters.AddWithValue("maxRows", maxRows);
            updatedCount = await updateCmd.ExecuteNonQueryAsync(cancellationToken);
        }

        _logger.LogInformation(
            "Support bulk Review Inbox {Action}: updated {UpdatedCount}/{MatchingCount} row(s) (maxRows={MaxRows})",
            action,
            updatedCount,
            matchingCount,
            maxRows);

        return new SupportBulkClearReviewInboxResponse
        {
            DryRun = false,
            Action = action,
            MatchingCount = matchingCount,
            UpdatedCount = updatedCount,
            Message =
                $"Marked {updatedCount} row(s) as {action}. {Math.Max(0, matchingCount - updatedCount)} additional row(s) still match (re-run or raise maxRows).",
        };
    }

    /// <inheritdoc />
    public async Task<SupportBulkReprocessReviewInboxResponse> BulkReprocessReviewInboxAsync(
        SupportBulkReprocessReviewInboxRequest request,
        CancellationToken cancellationToken = default)
    {
        var maxRows = Math.Clamp(request.MaxRows <= 0 ? 10 : request.MaxRows, 1, 50);
        var (whereSql, parameters) = BuildReviewInboxReprocessFilter(request);

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        var countSql = $"""
            SELECT COUNT(*)
            FROM public.processed_emails pe
            LEFT JOIN public.pets p ON p.id = pe.pet_id AND p.deleted_at IS NULL
            LEFT JOIN auth.users u ON u.id = p.user_id
            WHERE {whereSql}
            """;

        int eligibleCount;
        await using (var countCmd = new NpgsqlCommand(countSql, conn))
        {
            foreach (var (name, value) in parameters)
                countCmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
            var scalar = await countCmd.ExecuteScalarAsync(cancellationToken);
            eligibleCount = scalar is long l ? (int)l : Convert.ToInt32(scalar ?? 0);
        }

        if (request.DryRun)
        {
            return new SupportBulkReprocessReviewInboxResponse
            {
                DryRun = true,
                EligibleCount = eligibleCount,
                Message =
                    $"Dry run: {eligibleCount} row(s) can be reprocessed (up to {maxRows} per call). " +
                    "Set dryRun=false to invoke mailgun-process-pet-mail and file health records.",
            };
        }

        var selectSql = $"""
            SELECT pe.id, pe.s3_key, pe.pet_id, pe.document_type, pe.subject
            FROM public.processed_emails pe
            LEFT JOIN public.pets p ON p.id = pe.pet_id AND p.deleted_at IS NULL
            LEFT JOIN auth.users u ON u.id = p.user_id
            WHERE {whereSql}
            ORDER BY pe.completed_at DESC NULLS LAST
            LIMIT @maxRows
            """;

        var candidates = new List<(Guid Id, string S3Key, Guid PetId, string? DocumentType, string? Subject)>();
        await using (var selectCmd = new NpgsqlCommand(selectSql, conn))
        {
            foreach (var (name, value) in parameters)
                selectCmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
            selectCmd.Parameters.AddWithValue("maxRows", maxRows);
            await using var reader = await selectCmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                candidates.Add((
                    reader.GetGuid(0),
                    reader.GetString(1),
                    reader.GetGuid(2),
                    reader.IsDBNull(3) ? null : reader.GetString(3),
                    reader.IsDBNull(4) ? null : reader.GetString(4)));
            }
        }

        var results = new List<SupportBulkReprocessRowResultDto>();
        var succeeded = 0;
        var failed = 0;
        var skipped = 0;

        foreach (var row in candidates)
        {
            var docType = _edgeReprocess.MapPipelineDocumentType(row.DocumentType, request.DefaultDocType);
            if (docType is null)
            {
                skipped++;
                results.Add(new SupportBulkReprocessRowResultDto
                {
                    EmailId = row.Id,
                    Subject = row.Subject,
                    Status = "skipped",
                    Message = "No mappable document_type for reprocessing",
                });
                continue;
            }

            try
            {
                var edge = await _edgeReprocess.ReprocessStoredEmailAsync(
                    row.S3Key,
                    row.PetId,
                    docType,
                    cancellationToken);

                if (!edge.HttpOk || !edge.Outcome.Reprocessed || !edge.Outcome.RecordsInserted)
                {
                    failed++;
                    results.Add(new SupportBulkReprocessRowResultDto
                    {
                        EmailId = row.Id,
                        Subject = row.Subject,
                        Status = "failed",
                        Message = edge.Outcome.Message ?? edge.RawBody ?? "Reprocessing failed",
                    });
                    continue;
                }

                await _edgeReprocess.MarkReviewInboxResolvedAsync(row.Id, row.PetId, cancellationToken);
                succeeded++;
                results.Add(new SupportBulkReprocessRowResultDto
                {
                    EmailId = row.Id,
                    Subject = row.Subject,
                    Status = "succeeded",
                    Message = $"Filed as {docType}",
                });
            }
            catch (Exception ex)
            {
                failed++;
                _logger.LogWarning(ex, "Support reprocess failed for processed_email id={EmailId}", row.Id);
                results.Add(new SupportBulkReprocessRowResultDto
                {
                    EmailId = row.Id,
                    Subject = row.Subject,
                    Status = "failed",
                    Message = ex.Message,
                });
            }
        }

        _logger.LogInformation(
            "Support bulk reprocess Review Inbox: {Succeeded}/{Attempted} succeeded (eligible={Eligible})",
            succeeded,
            candidates.Count,
            eligibleCount);

        return new SupportBulkReprocessReviewInboxResponse
        {
            DryRun = false,
            EligibleCount = eligibleCount,
            AttemptedCount = candidates.Count,
            SucceededCount = succeeded,
            FailedCount = failed,
            SkippedCount = skipped,
            Results = results,
            Message =
                $"Reprocessed {candidates.Count} row(s): {succeeded} succeeded, {failed} failed, {skipped} skipped. " +
                $"{Math.Max(0, eligibleCount - candidates.Count)} more row(s) match — re-run to continue.",
        };
    }

    internal static (string WhereSql, List<(string Name, object? Value)> Parameters) BuildReviewInboxReprocessFilter(
        SupportBulkReprocessReviewInboxRequest request)
    {
        var parts = new List<string>
        {
            "pe.status = 'completed'",
            "pe.pet_id IS NOT NULL",
            "pe.s3_key IS NOT NULL",
            "length(trim(pe.s3_key)) > 0",
            "(pe.success = false OR NULLIF(trim(pe.failure_reason), '') IS NOT NULL OR COALESCE(pe.review_status, 'pending') = 'pending')",
            "NOT (COALESCE(pe.review_status, '') = 'resolved' AND pe.success = true AND NULLIF(trim(pe.failure_reason), '') IS NULL)",
        };
        var parameters = new List<(string Name, object? Value)>();

        if (!request.IncludeDismissed)
        {
            parts.Add("COALESCE(pe.review_status, 'pending') NOT IN ('dismissed', 'resolved')");
        }

        if (request.OwnerUserId is { } ownerUserId)
        {
            parts.Add("p.user_id = @ownerUserId");
            parameters.Add(("ownerUserId", ownerUserId));
        }

        var ownerEmail = (request.OwnerEmail ?? "").Trim();
        if (ownerEmail.Length > 0)
        {
            parts.Add("lower(u.email) = lower(@ownerEmail)");
            parameters.Add(("ownerEmail", ownerEmail));
        }

        if (request.From is { } from)
        {
            parts.Add("pe.completed_at >= @from");
            parameters.Add(("from", from));
        }

        if (request.To is { } to)
        {
            parts.Add("pe.completed_at < @to");
            parameters.Add(("to", to));
        }

        if (request.EmailIds is { Count: > 0 } ids)
        {
            parts.Add("pe.id = ANY(@emailIds)");
            parameters.Add(("emailIds", ids.ToArray()));
        }

        return (string.Join(" AND ", parts), parameters);
    }

    /// <summary>Same visibility rules as consumer Review Inbox (<c>isReviewInboxCandidate</c>).</summary>
    internal static (string WhereSql, List<(string Name, object? Value)> Parameters) BuildReviewInboxClearFilter(
        SupportBulkClearReviewInboxRequest request)
    {
        var parts = new List<string>
        {
            "pe.status = 'completed'",
            "COALESCE(pe.review_status, 'pending') NOT IN ('dismissed', 'resolved')",
            "(pe.success = false OR NULLIF(trim(pe.failure_reason), '') IS NOT NULL)",
        };
        var parameters = new List<(string Name, object? Value)>();

        if (request.OwnerUserId is { } ownerUserId)
        {
            parts.Add("p.user_id = @ownerUserId");
            parameters.Add(("ownerUserId", ownerUserId));
        }

        var ownerEmail = (request.OwnerEmail ?? "").Trim();
        if (ownerEmail.Length > 0)
        {
            parts.Add("lower(u.email) = lower(@ownerEmail)");
            parameters.Add(("ownerEmail", ownerEmail));
        }

        if (request.From is { } from)
        {
            parts.Add("pe.completed_at >= @from");
            parameters.Add(("from", from));
        }

        if (request.To is { } to)
        {
            parts.Add("pe.completed_at < @to");
            parameters.Add(("to", to));
        }

        if (request.EmailIds is { Count: > 0 } ids)
        {
            parts.Add("pe.id = ANY(@emailIds)");
            parameters.Add(("emailIds", ids.ToArray()));
        }

        return (string.Join(" AND ", parts), parameters);
    }

    private async Task PopulateDiagnosticsAsync(
        SupportProcessedEmailDetailDto detail,
        CancellationToken cancellationToken)
    {
        var (visible, hiddenReason) = GetConsumerInboxVisibility(
            detail.Status,
            detail.Success,
            detail.FailureReason,
            detail.ReviewStatus);
        detail.ConsumerInboxVisible = visible;
        detail.ConsumerInboxHiddenReason = hiddenReason;
        detail.CanOwnerResolve = MailInboxResolveService.CanResolveProcessedEmail(
            detail.Success,
            detail.FailureReason,
            detail.ReviewStatus);

        if (!IsSupabaseStorageConfigured())
        {
            detail.StoredArchiveStatus = "storage_not_configured";
            detail.StoredArchiveMessage =
                "Set Supabase__Url and Supabase__ServiceRoleKey on PawBuck.API to check pending-emails archive.";
        }
        else if (string.IsNullOrWhiteSpace(detail.S3Key))
        {
            detail.StoredArchiveStatus = "missing";
            detail.StoredArchiveMessage = "Row has no s3_key (Message-Id). Cannot reprocess.";
        }
        else
        {
            var archive = await TryLoadPendingEmailAsync(detail.S3Key, cancellationToken);
            if (!string.IsNullOrEmpty(archive.ErrorCode))
            {
                detail.StoredArchiveStatus = archive.ErrorCode == ErrorAttachmentNotStored ? "missing" : "invalid_json";
                detail.StoredArchiveMessage = archive.ErrorMessage;
            }
            else if (archive.Attachments is null || archive.Attachments.Count == 0)
            {
                detail.StoredArchiveStatus = "missing";
                detail.StoredArchiveMessage = "Archive JSON exists but lists no attachments.";
            }
            else
            {
                var bodiesMissing = archive.Attachments.All(a =>
                    string.IsNullOrWhiteSpace(a.Content) ||
                    a.ContentWasStrippedForArchive == true);
                if (bodiesMissing)
                {
                    detail.StoredArchiveStatus = "metadata_only";
                    detail.StoredArchiveMessage =
                        "Archive JSON exists but attachment bytes were stripped (size cap). Reprocess likely fails.";
                }
                else
                {
                    detail.StoredArchiveStatus = "stored";
                    detail.StoredArchiveMessage =
                        $"Archive JSON OK ({archive.Attachments.Count} attachment(s) with bodies).";
                }
            }
        }

        detail.RecommendedAction = BuildRecommendedAction(detail);
    }

  internal static (bool Visible, string? HiddenReason) GetConsumerInboxVisibility(
        string status,
        bool? success,
        string? failureReason,
        string? reviewStatus)
    {
        if (reviewStatus is "dismissed" or "resolved")
            return (false, $"Hidden: review_status={reviewStatus}");
        if (!string.Equals(status, "completed", StringComparison.OrdinalIgnoreCase))
        {
            return (false,
                $"Hidden from consumer app: status={status}. Stuck processing locks often cause Confirm 502/409.");
        }

        if (success == false)
            return (true, null);
        if (!string.IsNullOrWhiteSpace(failureReason))
            return (true, null);
        return (false, "Hidden: no failure signal (success=true, no failure_reason).");
    }

    internal static string BuildRecommendedAction(SupportProcessedEmailDetailDto detail)
    {
        if (string.Equals(detail.Status, "processing", StringComparison.OrdinalIgnoreCase))
        {
            return "Stuck lock: set status=completed in DB or deploy API+edge lock fix, then Reprocess & file.";
        }

        if (detail.StoredArchiveStatus == "storage_not_configured")
            return "Configure API Supabase URL + service role key, then refresh detail.";

        if (detail.StoredArchiveStatus is "missing" or "invalid_json")
            return "Cannot reprocess: no usable pending-emails JSON. Owner must re-send the email or add records manually.";

        if (detail.StoredArchiveStatus == "metadata_only")
            return "Reprocess may fail without PDF bytes. Re-send email or use manual health record entry.";

        if (!detail.CanOwnerResolve)
            return detail.ReviewStatus is "dismissed" or "resolved"
                ? "Already cleared from Review Inbox. Use Reprocess only if records are still missing."
                : "Row not eligible for owner Confirm.";

        if (detail.ConsumerInboxVisible)
        {
            return "Use Reprocess & file (same as owner Confirm). Ensure edge secrets PAWBUCK_API_URL + MILO_INTERNAL_SERVICE_KEY.";
        }

        return "Not shown in consumer Processing errors; inspect failure_reason and review_status.";
    }

    private static string EscapeForLike(string value)
    {
        return value.Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
    }
}
