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

        await using (var conn = CreateConnection())
        {
            await conn.OpenAsync(cancellationToken);
            const string sql = """
                SELECT pe.s3_key, pe.success, pe.review_status
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
        }

        if (success == true)
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

        // Optional: only allow if still in review queue
        if (reviewStatus is { } rs && rs == "dismissed")
        {
            return new MailInboxResolveResult
            {
                Ok = false,
                StatusCode = 409,
                Error = "This item was already dismissed from the review queue.",
            };
        }

        var baseUrl = _options.Value.Url?.TrimEnd('/');
        var serviceKey = _options.Value.ServiceRoleKey?.Trim();
        if (string.IsNullOrEmpty(baseUrl) || string.IsNullOrEmpty(serviceKey))
        {
            _logger.LogError("Supabase:Url or ServiceRoleKey not configured; cannot invoke mailgun-process-pet-mail");
            return new MailInboxResolveResult
            {
                Ok = false,
                StatusCode = 503,
                Error = "Server is not configured for inbox resolution (Supabase URL / service key).",
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

        return new MailInboxResolveResult { Ok = true, StatusCode = 200 };
    }
}
