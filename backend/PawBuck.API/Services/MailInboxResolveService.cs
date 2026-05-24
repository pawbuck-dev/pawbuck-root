using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class MailInboxResolveService : IMailInboxResolveService
{
    private readonly IOptions<SupabaseOptions> _options;
    private readonly IMiloPetFactsService _petFacts;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MailInboxResolveService> _logger;

    public MailInboxResolveService(
        IOptions<SupabaseOptions> options,
        IMiloPetFactsService petFacts,
        IHttpClientFactory httpClientFactory,
        ILogger<MailInboxResolveService> logger)
    {
        _options = options;
        _petFacts = petFacts;
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

    private static string NormalizeDocumentType(string raw)
    {
        var n = raw.Trim().ToLowerInvariant().Replace('-', '_');
        return n switch
        {
            "vaccine" or "vaccination" or "vaccinations" => "vaccinations",
            "medication" or "medications" => "medications",
            "lab" or "lab_result" or "lab_results" => "lab_results",
            "clinical_visit" or "clinical_exam" or "clinical_exams" or "exam" => "clinical_exams",
            _ => n
        };
    }

    /// <inheritdoc />
    public async Task<MailInboxResolveResult> ResolveAsync(
        Guid userId,
        MailResolveRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.SelectedDocType))
            return new MailInboxResolveResult { Ok = false, StatusCode = 400, Error = "selected_doc_type is required" };

        var docNorm = NormalizeDocumentType(request.SelectedDocType);
        var allowed = new[] { "vaccinations", "medications", "lab_results", "clinical_exams" };
        if (Array.IndexOf(allowed, docNorm) < 0)
        {
            return new MailInboxResolveResult
            {
                Ok = false,
                StatusCode = 400,
                Error = "selected_doc_type must be one of: vaccinations, medications, lab_results, clinical_exams (or short aliases: vaccine, medication, lab, exam)",
            };
        }

        if (!await _petFacts.VerifyPetOwnershipAsync(userId, request.SelectedPetId, cancellationToken))
        {
            return new MailInboxResolveResult { Ok = false, StatusCode = 403, Error = "Pet not found or not owned by user" };
        }

        string? s3Key;
        bool? success;
        string? reviewStatus;
        string? failureReason;

        await using (var conn = CreateConnection())
        {
            await conn.OpenAsync(cancellationToken);
            const string sql = """
                SELECT pe.s3_key, pe.success, pe.review_status, pe.failure_reason
                FROM public.processed_emails pe
                INNER JOIN public.pets p ON p.id = pe.pet_id
                WHERE pe.id = @id
                  AND p.user_id = @userId
                LIMIT 1
                """;
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("id", request.EmailId);
            cmd.Parameters.AddWithValue("userId", userId);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return new MailInboxResolveResult { Ok = false, StatusCode = 404, Error = "email record not found" };
            }
            s3Key = reader.GetString(0);
            success = reader.IsDBNull(1) ? null : reader.GetBoolean(1);
            reviewStatus = reader.IsDBNull(2) ? null : reader.GetString(2);
            failureReason = reader.IsDBNull(3) ? null : reader.GetString(3);
        }

        if (reviewStatus is { } rs && rs == "dismissed")
        {
            return new MailInboxResolveResult
            {
                Ok = false,
                StatusCode = 409,
                Error = "This item was already dismissed from the review queue.",
            };
        }

        if (!CanResolveProcessedEmail(success, failureReason, reviewStatus))
        {
            return new MailInboxResolveResult
            {
                Ok = false,
                StatusCode = 409,
                Error = "This email is already marked successfully processed; nothing to resolve.",
            };
        }

        if (string.IsNullOrEmpty(s3Key))
        {
            return new MailInboxResolveResult { Ok = false, StatusCode = 400, Error = "email record has no s3_key" };
        }

        var baseUrl = _options.Value.Url?.TrimEnd('/');
        var serviceKey = _options.Value.ServiceRoleKey?.Trim();
        if (string.IsNullOrEmpty(baseUrl))
        {
            _logger.LogError("Supabase:Url not configured; cannot invoke mailgun-process-pet-mail");
            return new MailInboxResolveResult
            {
                Ok = false,
                StatusCode = 503,
                Error = "Server is not configured for inbox resolution (Supabase URL missing).",
            };
        }

        if (string.IsNullOrEmpty(serviceKey))
        {
            _logger.LogError("Supabase:ServiceRoleKey not configured; cannot invoke mailgun-process-pet-mail");
            return new MailInboxResolveResult
            {
                Ok = false,
                StatusCode = 503,
                Error = "Server is not configured for inbox resolution (Supabase service key missing).",
            };
        }

        var edgeUrl = $"{baseUrl}/functions/v1/mailgun-process-pet-mail";
        var payload = new
        {
            fileKey = s3Key,
            overridePetId = request.SelectedPetId.ToString(),
            documentTypeOverride = docNorm,
        };

        var client = _httpClientFactory.CreateClient(nameof(MailInboxResolveService));
        using var httpReq = new HttpRequestMessage(HttpMethod.Post, edgeUrl);
        httpReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", serviceKey);
        httpReq.Content = new StringContent(
            JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            }),
            Encoding.UTF8,
            "application/json");

        _logger.LogInformation(
            "Invoking mailgun-process-pet-mail for Review Inbox email_id={EmailId} pet_id={PetId} docType={DocType}",
            request.EmailId,
            request.SelectedPetId,
            docNorm);

        using var res = await client.SendAsync(httpReq, cancellationToken);
        var text = await res.Content.ReadAsStringAsync(cancellationToken);
        if (!res.IsSuccessStatusCode)
        {
            _logger.LogWarning("Edge mailgun failed: {Status} {Body}", (int)res.StatusCode, text);
            return new MailInboxResolveResult
            {
                Ok = false,
                StatusCode = 502,
                Error = "Document reprocessing failed. Please try again later.",
                BodySnippet = text.Length > 500 ? text[..500] : text,
            };
        }

        var edgeOutcome = ParseEdgeResolveOutcome(text);
        if (!edgeOutcome.Reprocessed)
        {
            _logger.LogWarning(
                "Edge mailgun skipped reprocess for email_id={EmailId}: {Message}",
                request.EmailId,
                edgeOutcome.Message ?? text);
            return new MailInboxResolveResult
            {
                Ok = false,
                StatusCode = 409,
                Error = edgeOutcome.Message ??
                        "Could not reprocess this email. Please try again or remove it from the review list.",
            };
        }

        if (!edgeOutcome.RecordsInserted)
        {
            return new MailInboxResolveResult
            {
                Ok = false,
                StatusCode = 422,
                Error =
                    "We couldn't save a health record from this email. Check the document and try again, or add the record manually.",
            };
        }

        await MarkReviewInboxResolvedAsync(
            request.EmailId,
            request.SelectedPetId,
            userId,
            cancellationToken);

        return new MailInboxResolveResult { Ok = true, StatusCode = 200 };
    }

    internal sealed record EdgeResolveOutcome(
        bool Reprocessed,
        bool RecordsInserted,
        string? Message);

    internal static EdgeResolveOutcome ParseEdgeResolveOutcome(string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
            return new EdgeResolveOutcome(false, false, "Empty response from document processor");

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
                    return new EdgeResolveOutcome(false, false, message);
                }
            }

            if (root.TryGetProperty("success", out var successProp) &&
                successProp.ValueKind == JsonValueKind.False)
            {
                var err = root.TryGetProperty("error", out var errProp)
                    ? errProp.GetString()
                    : "Document reprocessing failed";
                return new EdgeResolveOutcome(false, false, err);
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
                // Legacy / minimal success payloads without attachment details.
                inserted = true;
            }

            return new EdgeResolveOutcome(true, inserted, null);
        }
        catch (JsonException)
        {
            return new EdgeResolveOutcome(true, true, null);
        }
    }

    private async Task MarkReviewInboxResolvedAsync(
        Guid emailId,
        Guid petId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            UPDATE public.processed_emails pe
            SET review_status = 'resolved',
                failure_reason = NULL,
                success = TRUE,
                pet_id = @petId
            WHERE pe.id = @id
              AND COALESCE(pe.review_status, 'pending') NOT IN ('dismissed', 'resolved')
              AND EXISTS (
                SELECT 1 FROM public.pets owner_pet
                WHERE owner_pet.id = pe.pet_id AND owner_pet.user_id = @userId
              )
              AND EXISTS (
                SELECT 1 FROM public.pets selected_pet
                WHERE selected_pet.id = @petId AND selected_pet.user_id = @userId
              )
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("id", emailId);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("userId", userId);
        var rows = await cmd.ExecuteNonQueryAsync(cancellationToken);
        if (rows == 0)
        {
            _logger.LogWarning(
                "MarkReviewInboxResolved updated 0 rows for email_id={EmailId} (may already be resolved)",
                emailId);
        }
    }

    /// <summary>
    /// Allows Review Inbox resolve when processing failed or is pending, including legacy rows
    /// where <c>success</c> was true but <c>failure_reason</c> was still set.
    /// </summary>
    internal static bool CanResolveProcessedEmail(
        bool? success,
        string? failureReason,
        string? reviewStatus)
    {
        if (reviewStatus == "dismissed")
            return false;
        if (success != true)
            return true;
        if (!string.IsNullOrWhiteSpace(failureReason))
            return true;
        if (reviewStatus == "pending")
            return true;
        return false;
    }
}
