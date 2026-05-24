using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class MailgunEdgeReprocessService : IMailgunEdgeReprocessService
{
    private static readonly string[] AllowedPipelineTypes =
        ["vaccinations", "medications", "lab_results", "clinical_exams"];

    private readonly IOptions<SupabaseOptions> _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MailgunEdgeReprocessService> _logger;

    public MailgunEdgeReprocessService(
        IOptions<SupabaseOptions> options,
        IHttpClientFactory httpClientFactory,
        ILogger<MailgunEdgeReprocessService> logger)
    {
        _options = options;
        _httpClientFactory = httpClientFactory;
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
    public async Task<MailgunEdgeReprocessResult> ReprocessStoredEmailAsync(
        string s3Key,
        Guid petId,
        string documentType,
        CancellationToken cancellationToken = default)
    {
        var docNorm = NormalizeDocumentType(documentType);
        if (Array.IndexOf(AllowedPipelineTypes, docNorm) < 0)
        {
            return new MailgunEdgeReprocessResult
            {
                HttpOk = false,
                Outcome = new MailgunEdgeParseOutcome(false, false, "Unsupported document type for reprocessing"),
            };
        }

        var baseUrl = _options.Value.Url?.TrimEnd('/');
        var serviceKey = _options.Value.ServiceRoleKey?.Trim();
        if (string.IsNullOrEmpty(baseUrl) || string.IsNullOrEmpty(serviceKey))
        {
            return new MailgunEdgeReprocessResult
            {
                HttpOk = false,
                Outcome = new MailgunEdgeParseOutcome(
                    false,
                    false,
                    "Server is not configured for inbox reprocessing (Supabase URL or service key missing)."),
            };
        }

        var edgeUrl = $"{baseUrl}/functions/v1/mailgun-process-pet-mail";
        var payload = new
        {
            fileKey = s3Key,
            overridePetId = petId.ToString(),
            documentTypeOverride = docNorm,
        };

        var client = _httpClientFactory.CreateClient(nameof(MailgunEdgeReprocessService));
        using var httpReq = new HttpRequestMessage(HttpMethod.Post, edgeUrl);
        httpReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", serviceKey);
        httpReq.Content = new StringContent(
            JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            }),
            Encoding.UTF8,
            "application/json");

        using var res = await client.SendAsync(httpReq, cancellationToken);
        var text = await res.Content.ReadAsStringAsync(cancellationToken);
        var outcome = ParseEdgeResponse(text);
        return new MailgunEdgeReprocessResult
        {
            HttpOk = res.IsSuccessStatusCode,
            Outcome = outcome,
            RawBody = text.Length > 500 ? text[..500] : text,
        };
    }

    /// <inheritdoc />
    public async Task ReopenProcessedEmailRowAsync(Guid processedEmailId, CancellationToken cancellationToken = default)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            UPDATE public.processed_emails
            SET status = 'processing',
                success = NULL,
                completed_at = NULL,
                failure_reason = NULL,
                review_status = 'pending'
            WHERE id = @id
              AND status = 'completed'
              AND s3_key IS NOT NULL
              AND length(trim(s3_key)) > 0
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("id", processedEmailId);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task MarkReviewInboxResolvedAsync(
        Guid processedEmailId,
        Guid petId,
        CancellationToken cancellationToken = default)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            UPDATE public.processed_emails
            SET review_status = 'resolved',
                failure_reason = NULL,
                success = TRUE,
                pet_id = @petId
            WHERE id = @id
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("id", processedEmailId);
        cmd.Parameters.AddWithValue("petId", petId);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    /// <inheritdoc />
    public MailgunEdgeParseOutcome ParseEdgeResponse(string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
            return new MailgunEdgeParseOutcome(false, false, "Empty response from document processor");

        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            if (root.TryGetProperty("message", out var messageProp))
            {
                var message = messageProp.GetString() ?? "";
                if (message.Contains("already processed", StringComparison.OrdinalIgnoreCase) ||
                    message.Contains("currently being processed", StringComparison.OrdinalIgnoreCase))
                {
                    return new MailgunEdgeParseOutcome(false, false, message);
                }
            }

            if (root.TryGetProperty("success", out var successProp) &&
                successProp.ValueKind == JsonValueKind.False)
            {
                var err = root.TryGetProperty("error", out var errProp)
                    ? errProp.GetString()
                    : "Document reprocessing failed";
                return new MailgunEdgeParseOutcome(false, false, err);
            }

            var inserted = false;
            if (root.TryGetProperty("processedAttachments", out var attachments) &&
                attachments.ValueKind == JsonValueKind.Array)
            {
                if (attachments.GetArrayLength() == 0)
                {
                    inserted = true;
                }
                else
                {
                    foreach (var attachment in attachments.EnumerateArray())
                    {
                        if (attachment.TryGetProperty("dbInserted", out var dbInserted) &&
                            dbInserted.ValueKind == JsonValueKind.True)
                        {
                            inserted = true;
                            break;
                        }
                        if (attachment.TryGetProperty("vaultPersisted", out var vaultPersisted) &&
                            vaultPersisted.ValueKind == JsonValueKind.True)
                        {
                            inserted = true;
                            break;
                        }
                    }
                }
            }
            else
            {
                inserted = true;
            }

            return new MailgunEdgeParseOutcome(true, inserted, null);
        }
        catch (JsonException)
        {
            return new MailgunEdgeParseOutcome(true, true, null);
        }
    }

    /// <inheritdoc />
    public string? MapPipelineDocumentType(string? storedDocumentType, string? defaultDocumentType)
    {
        if (!string.IsNullOrWhiteSpace(storedDocumentType))
        {
            var n = storedDocumentType.Trim().ToLowerInvariant().Replace('-', '_');
            var mapped = n switch
            {
                "vaccine" or "vaccination" or "vaccinations" => "vaccinations",
                "medication" or "medications" => "medications",
                "lab" or "lab_result" or "lab_results" => "lab_results",
                "clinical_visit" or "clinical_exam" or "clinical_exams" or "exam" => "clinical_exams",
                "travel_certificate" => "clinical_exams",
                _ => NormalizeDocumentType(n),
            };
            if (Array.IndexOf(AllowedPipelineTypes, mapped) >= 0)
                return mapped;
        }

        if (string.IsNullOrWhiteSpace(defaultDocumentType))
            return null;

        var fallback = NormalizeDocumentType(defaultDocumentType);
        return Array.IndexOf(AllowedPipelineTypes, fallback) >= 0 ? fallback : null;
    }

    internal static string NormalizeDocumentType(string raw)
    {
        return raw.Trim().ToLowerInvariant().Replace('-', '_');
    }
}
