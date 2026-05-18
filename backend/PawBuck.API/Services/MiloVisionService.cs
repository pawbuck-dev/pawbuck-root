using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <inheritdoc />
public class MiloVisionService : IMiloVisionService
{
    private const string GeminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static readonly HashSet<string> AllowedDocumentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "medications", "lab_results", "clinical_exams", "vaccinations", "billing_invoice",
        "travel_certificate", "insurance_policy", "pedigree", "identity_document", "irrelevant",
    };

    private readonly IMiloPetFactsService _petFacts;
    private readonly IMiloPromptProvider _prompts;
    private readonly IPetDocumentClinicalSyncService _clinicalSync;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<SupabaseOptions> _supabaseOptions;
    private readonly IOptions<GeminiOptions> _geminiOptions;
    private readonly ILogger<MiloVisionService> _logger;

    public MiloVisionService(
        IMiloPetFactsService petFacts,
        IMiloPromptProvider prompts,
        IPetDocumentClinicalSyncService clinicalSync,
        IHttpClientFactory httpClientFactory,
        IOptions<SupabaseOptions> supabaseOptions,
        IOptions<GeminiOptions> geminiOptions,
        ILogger<MiloVisionService> logger)
    {
        _petFacts = petFacts;
        _prompts = prompts;
        _clinicalSync = clinicalSync;
        _httpClientFactory = httpClientFactory;
        _supabaseOptions = supabaseOptions;
        _geminiOptions = geminiOptions;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<PetDocumentVaultRowDto> AnalyzeAndPersistAsync(
        Guid userId,
        string bearerToken,
        AnalyzePetDocumentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Path))
            throw new ArgumentException("path is required", nameof(request));

        var ok = await _petFacts.VerifyPetOwnershipAsync(userId, request.PetId, cancellationToken);
        if (!ok)
            throw new UnauthorizedAccessException("Pet not found or access denied");

        var ownerId = await GetPetOwnerUserIdAsync(request.PetId, cancellationToken)
                      ?? throw new InvalidOperationException("Pet owner not found");

        var supabaseUrl = _supabaseOptions.Value.Url?.Trim();
        if (string.IsNullOrEmpty(supabaseUrl))
            throw new InvalidOperationException("Supabase:Url is not configured");

        var bucket = string.IsNullOrWhiteSpace(request.Bucket) ? "pets" : request.Bucket.Trim();
        var bytes = await DownloadStorageObjectAsync(supabaseUrl, bucket, request.Path, bearerToken, cancellationToken);

        var mime = ResolveMimeType(request.MimeType, request.Path);
        return await ProcessBytesAndInsertAsync(
            request.PetId,
            ownerId,
            request.Path,
            mime,
            bytes,
            internalOptions: null,
            cancellationToken);
    }

    /// <inheritdoc />
    public async Task<PetDocumentVaultRowDto> AnalyzeAndPersistInternalAsync(
        AnalyzePetDocumentInternalRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Path))
            throw new ArgumentException("path is required", nameof(request));

        var ownerId = await GetPetOwnerUserIdAsync(request.PetId, cancellationToken)
                      ?? throw new InvalidOperationException("Pet owner not found");
        if (ownerId != request.UserId)
            throw new UnauthorizedAccessException("userId does not own this pet");

        var sr = _supabaseOptions.Value.ServiceRoleKey?.Trim();
        if (string.IsNullOrEmpty(sr))
            throw new InvalidOperationException("Supabase ServiceRoleKey is not configured for internal document analyze");

        var supabaseUrl = _supabaseOptions.Value.Url?.Trim();
        if (string.IsNullOrEmpty(supabaseUrl))
            throw new InvalidOperationException("Supabase:Url is not configured");

        var bucket = string.IsNullOrWhiteSpace(request.Bucket) ? "pets" : request.Bucket.Trim();
        var bytes = await DownloadStorageObjectAsync(supabaseUrl, bucket, request.Path, sr, cancellationToken);

        var mime = ResolveMimeType(request.MimeType, request.Path);
        return await ProcessBytesAndInsertAsync(
            request.PetId,
            ownerId,
            request.Path,
            mime,
            bytes,
            new InternalDocumentProcessOptions
            {
                DocumentId = request.DocumentId,
                DocumentTypeOverride = request.DocumentTypeOverride,
                IngestionSource = request.IngestionSource,
            },
            cancellationToken);
    }

    private sealed class InternalDocumentProcessOptions
    {
        public Guid? DocumentId { get; init; }
        public string? DocumentTypeOverride { get; init; }
        public string? IngestionSource { get; init; }
    }

    private async Task<PetDocumentVaultRowDto> ProcessBytesAndInsertAsync(
        Guid petId,
        Guid ownerUserId,
        string storagePath,
        string mimeType,
        byte[] bytes,
        InternalDocumentProcessOptions? internalOptions,
        CancellationToken cancellationToken)
    {
        var base64 = Convert.ToBase64String(bytes);
        var apiKey = _geminiOptions.Value.ApiKey?.Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            apiKey = Environment.GetEnvironmentVariable("GOOGLE_GEMINI_API_KEY")?.Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Gemini API key is not configured");

        var model = string.IsNullOrWhiteSpace(_geminiOptions.Value.Model)
            ? GeminiOptions.DefaultModelId
            : _geminiOptions.Value.Model!.Trim();

        ClassificationParse classification;
        string docType;
        double classConfidence;

        var typeOverride = internalOptions?.DocumentTypeOverride?.Trim();
        if (!string.IsNullOrEmpty(typeOverride))
        {
            docType = NormalizeVaultDocumentType(typeOverride);
            classConfidence = 1.0;
            classification = new ClassificationParse(
                docType,
                classConfidence,
                "documentTypeOverride");
        }
        else
        {
            classification = await RunClassificationAsync(base64, mimeType, apiKey, model, cancellationToken);
            docType = NormalizeVaultDocumentType(classification.DocumentType);
            classConfidence = classification.Confidence;
        }

        string extractedJson;
        if (UsesFlexibleVaultExtraction(docType))
        {
            var extractionPrompt = _prompts.GetFlexibleExtractionPrompt(docType);
            extractedJson = await RunFlexibleExtractionAsync(
                base64, mimeType, extractionPrompt, apiKey, model, cancellationToken);
        }
        else
        {
            var extractionPrompt = _prompts.GetPromptForType(docType);
            extractedJson = await RunMedicalRecordExtractionAsync(
                base64, mimeType, extractionPrompt, apiKey, model, cancellationToken);

            if (IsVaccinationsDocumentType(docType) && !HasVaccinationItemsInExtraction(extractedJson))
            {
                const string retrySuffix = """

IMPORTANT: Return a non-empty "items" array for vaccines explicitly listed as administered/given on the document.
Each administered vaccine must have "administeredDate" (ISO YYYY-MM-DD) and "expiryDate" when a next-due date is shown.
Do NOT include vaccines that appear only under "due for booster", "next due", or similar — those are not proof of administration.
Use specific vaccine names (e.g. "DHPP", "DAPP", "Bordetella", "Leptospirosis") — never use the document title as an item name.
""";
                extractedJson = await RunMedicalRecordExtractionAsync(
                    base64, mimeType, extractionPrompt + retrySuffix, apiKey, model, cancellationToken);
            }
        }

        double rowConfidence = classConfidence;
        try
        {
            using var doc = JsonDocument.Parse(extractedJson);
            if (doc.RootElement.TryGetProperty("confidenceScore", out var cs) && cs.TryGetDouble(out var inner))
                rowConfidence = (classConfidence + inner) / 2.0;
        }
        catch
        {
            /* keep classification confidence */
        }

        var metadata = BuildVaultMetadata(classification.Reasoning, internalOptions);
        var row = await InsertPetDocumentAsync(
            petId,
            ownerUserId,
            storagePath,
            mimeType,
            docType,
            rowConfidence,
            extractedJson,
            metadata,
            internalOptions?.DocumentId,
            cancellationToken);

        if (IsClinicalSyncDocumentType(docType))
        {
            try
            {
                row.ClinicalSync = await _clinicalSync.SyncDocumentByIdAsync(row.Id, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Inline clinical sync failed for pet_documents {DocumentId}", row.Id);
                row.ClinicalSync = new PetDocumentClinicalSyncResult { Error = "sync_failed" };
            }
        }

        return row;
    }

    private static bool UsesFlexibleVaultExtraction(string docType) =>
        docType.Equals("insurance_policy", StringComparison.OrdinalIgnoreCase)
        || docType.Equals("pedigree", StringComparison.OrdinalIgnoreCase)
        || docType.Equals("identity_document", StringComparison.OrdinalIgnoreCase);

    private static bool IsClinicalSyncDocumentType(string docType) =>
        docType.Equals(MiloPetFactsKinds.Vaccinations, StringComparison.OrdinalIgnoreCase)
        || docType.Equals(MiloPetFactsKinds.Medications, StringComparison.OrdinalIgnoreCase)
        || docType.Equals(MiloPetFactsKinds.ClinicalExams, StringComparison.OrdinalIgnoreCase)
        || docType.Equals(MiloPetFactsKinds.LabResults, StringComparison.OrdinalIgnoreCase);

    private static bool IsVaccinationsDocumentType(string docType) =>
        docType.Equals(MiloPetFactsKinds.Vaccinations, StringComparison.OrdinalIgnoreCase);

    private static bool HasVaccinationItemsInExtraction(string extractedJson)
    {
        if (!VaultExtractedJsonParser.TryParseMedicalRecord(extractedJson, out var medical) || medical?.Items == null)
            return false;

        return VaultExtractedJsonParser.FilterVaccinationItems(medical.Items).Count > 0;
    }

    /// <summary>
    /// Maps classifier output to allowed <c>pet_documents</c> document types (same rules as ingestion).
    /// </summary>
    public static string NormalizeVaultDocumentType(string? raw)
    {
        var t = raw?.Trim().ToLowerInvariant() ?? "irrelevant";
        return AllowedDocumentTypes.Contains(t) ? t : "irrelevant";
    }

    /// <inheritdoc />
    public async Task<string> PreviewFlexibleExtractionAsync(
        byte[] bytes,
        string mimeType,
        string classifiedDocumentType,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(bytes);
        if (bytes.Length == 0)
            throw new ArgumentException("File bytes are empty.", nameof(bytes));

        var apiKey = _geminiOptions.Value.ApiKey?.Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            apiKey = Environment.GetEnvironmentVariable("GOOGLE_GEMINI_API_KEY")?.Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Gemini API key is not configured");

        var model = string.IsNullOrWhiteSpace(_geminiOptions.Value.Model)
            ? GeminiOptions.DefaultModelId
            : _geminiOptions.Value.Model!.Trim();

        var docType = NormalizeVaultDocumentType(classifiedDocumentType);
        var extractionPrompt = _prompts.GetFlexibleExtractionPrompt(docType);
        var base64 = Convert.ToBase64String(bytes);
        return await RunFlexibleExtractionAsync(base64, mimeType, extractionPrompt, apiKey, model, cancellationToken);
    }

    private async Task<byte[]> DownloadStorageObjectAsync(
        string supabaseUrl,
        string bucket,
        string objectPath,
        string bearerToken,
        CancellationToken cancellationToken)
    {
        var encoded = string.Join(
            "/",
            objectPath.Split('/', StringSplitOptions.RemoveEmptyEntries).Select(Uri.EscapeDataString));
        var url = $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/authenticated/{Uri.EscapeDataString(bucket)}/{encoded}";

        var client = _httpClientFactory.CreateClient("DocumentImageDownload");
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken.Trim());

        var response = await client.SendAsync(req, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Storage download failed {Status}: {Body}", response.StatusCode, body);
            throw new HttpRequestException($"Storage download failed: {(int)response.StatusCode}");
        }

        return await response.Content.ReadAsByteArrayAsync(cancellationToken);
    }

    private static string ResolveMimeType(string? mime, string path)
    {
        if (!string.IsNullOrWhiteSpace(mime))
            return mime.Trim();

        var lower = path.ToLowerInvariant();
        if (lower.EndsWith(".pdf", StringComparison.Ordinal)) return "application/pdf";
        if (lower.EndsWith(".png", StringComparison.Ordinal)) return "image/png";
        if (lower.EndsWith(".webp", StringComparison.Ordinal)) return "image/webp";
        if (lower.EndsWith(".heic", StringComparison.Ordinal)) return "image/heic";
        return "image/jpeg";
    }

    private async Task<ClassificationParse> RunClassificationAsync(
        string base64,
        string mime,
        string apiKey,
        string model,
        CancellationToken cancellationToken)
    {
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = _prompts.PetDocumentClassificationPrompt },
                        new { inline_data = new { mime_type = mime, data = base64 } },
                    },
                },
            },
            generationConfig = new
            {
                temperature = 0.1,
                response_mime_type = "application/json",
                response_schema = new
                {
                    type = "object",
                    properties = new
                    {
                        documentType = new
                        {
                            type = "string",
                            @enum = new[]
                            {
                                "medications", "lab_results", "clinical_exams", "vaccinations", "billing_invoice",
                                "travel_certificate", "insurance_policy", "pedigree", "identity_document", "irrelevant",
                            },
                        },
                        confidence = new { type = "number" },
                        reasoning = new { type = "string" },
                    },
                    required = new[] { "documentType", "confidence", "reasoning" },
                },
            },
        };

        var json = await CallGeminiGenerateContentAsync(requestBody, apiKey, model, cancellationToken);
        return ParseClassification(json);
    }

    private async Task<string> RunFlexibleExtractionAsync(
        string base64,
        string mime,
        string extractionPrompt,
        string apiKey,
        string model,
        CancellationToken cancellationToken)
    {
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = extractionPrompt },
                        new { inline_data = new { mime_type = mime, data = base64 } },
                    },
                },
            },
            generationConfig = new
            {
                temperature = 0.1,
                response_mime_type = "application/json",
                response_schema = new
                {
                    type = "object",
                    properties = new
                    {
                        title = new { type = "string" },
                        summary = new { type = "string" },
                        primaryDate = new { type = "string" },
                        keyFacts = new
                        {
                            type = "array",
                            items = new
                            {
                                type = "object",
                                properties = new
                                {
                                    label = new { type = "string" },
                                    value = new { type = "string" },
                                },
                                required = new[] { "label", "value" },
                            },
                        },
                        confidenceScore = new { type = "number" },
                    },
                    required = new[] { "title", "summary", "keyFacts", "confidenceScore" },
                },
            },
        };

        var json = await CallGeminiGenerateContentAsync(requestBody, apiKey, model, cancellationToken);
        var text = ExtractFirstCandidateText(json);
        if (string.IsNullOrWhiteSpace(text))
            return """{"title":"","summary":"","keyFacts":[],"confidenceScore":0}""";
        return text;
    }

    private async Task<string> RunMedicalRecordExtractionAsync(
        string base64,
        string mime,
        string extractionPrompt,
        string apiKey,
        string model,
        CancellationToken cancellationToken)
    {
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = extractionPrompt },
                        new { inline_data = new { mime_type = mime, data = base64 } },
                    },
                },
            },
            generationConfig = new
            {
                temperature = 0.1,
                response_mime_type = "application/json",
                response_schema = new
                {
                    type = "object",
                    properties = new
                    {
                        petName = new { type = "string" },
                        documentType = new { type = "string" },
                        clinicName = new { type = "string" },
                        dateOfVisit = new { type = "string" },
                        items = new
                        {
                            type = "array",
                            items = new
                            {
                                type = "object",
                                properties = new
                                {
                                    name = new { type = "string" },
                                    category = new { type = "string" },
                                    administeredDate = new { type = "string" },
                                    expiryDate = new { type = "string" },
                                },
                                required = new[] { "name", "category" },
                            },
                        },
                        confidenceScore = new { type = "number" },
                    },
                    required = new[] { "petName", "documentType", "clinicName", "dateOfVisit", "items", "confidenceScore" },
                },
            },
        };

        var json = await CallGeminiGenerateContentAsync(requestBody, apiKey, model, cancellationToken);
        var text = ExtractFirstCandidateText(json);
        if (string.IsNullOrWhiteSpace(text))
            return """{"petName":"","documentType":"irrelevant","clinicName":"","dateOfVisit":"","items":[],"confidenceScore":0}""";
        return text;
    }

    private async Task<string> CallGeminiGenerateContentAsync(object requestBody, string apiKey, string model, CancellationToken cancellationToken)
    {
        var geminiClient = _httpClientFactory.CreateClient("Gemini");
        var url = $"{GeminiBaseUrl}{model}:generateContent";
        using var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        request.SetGeminiApiKey(apiKey);
        var httpResponse = await geminiClient.SendAsync(request, cancellationToken);
        var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        if (!httpResponse.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gemini returned {Status}: {Body}", httpResponse.StatusCode, json);
            throw new InvalidOperationException($"Gemini API error: {(int)httpResponse.StatusCode}");
        }

        return json;
    }

    private static string ExtractFirstCandidateText(string geminiResponseJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(geminiResponseJson);
            var text = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0]
                .GetProperty("text").GetString();
            return text ?? string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    private static ClassificationParse ParseClassification(string geminiResponseJson)
    {
        var text = ExtractFirstCandidateText(geminiResponseJson);
        if (string.IsNullOrWhiteSpace(text))
            return new ClassificationParse("irrelevant", 0, "Empty Gemini response");

        try
        {
            var parsed = JsonSerializer.Deserialize<ClassificationDto>(text, JsonOptions);
            if (parsed != null)
                return new ClassificationParse(
                    parsed.DocumentType ?? "irrelevant",
                    parsed.Confidence,
                    parsed.Reasoning);
        }
        catch (Exception ex)
        {
            return new ClassificationParse("irrelevant", 0, $"Parse error: {ex.Message}");
        }

        return new ClassificationParse("irrelevant", 0, null);
    }

    private sealed class ClassificationDto
    {
        public string? DocumentType { get; set; }
        public double Confidence { get; set; }
        public string? Reasoning { get; set; }
    }

    private async Task<Guid?> GetPetOwnerUserIdAsync(Guid petId, CancellationToken cancellationToken)
    {
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT user_id
            FROM public.pets
            WHERE id = @petId AND deleted_at IS NULL
            LIMIT 1
            """,
            conn);
        cmd.Parameters.AddWithValue("petId", petId);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        return o is Guid g ? g : null;
    }

    private static string BuildVaultMetadata(string? classificationReasoning, InternalDocumentProcessOptions? options)
    {
        var dict = new Dictionary<string, object?>();
        if (!string.IsNullOrWhiteSpace(classificationReasoning))
            dict["classificationReasoning"] = classificationReasoning;
        if (!string.IsNullOrWhiteSpace(options?.IngestionSource))
            dict["ingestionSource"] = options.IngestionSource!.Trim();
        if (!string.IsNullOrWhiteSpace(options?.DocumentTypeOverride))
            dict["documentTypeOverride"] = options.DocumentTypeOverride!.Trim();
        return JsonSerializer.Serialize(dict);
    }

    private async Task<PetDocumentVaultRowDto> InsertPetDocumentAsync(
        Guid petId,
        Guid ownerUserId,
        string storagePath,
        string mimeType,
        string documentType,
        double confidence,
        string extractedJson,
        string? metadata,
        Guid? documentId,
        CancellationToken cancellationToken)
    {
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        var sql = documentId.HasValue
            ? """
              INSERT INTO public.pet_documents
                (id, pet_id, user_id, storage_path, mime_type, document_type, confidence, extracted_json, metadata, created_at, updated_at)
              VALUES
                (@id, @pet_id, @user_id, @storage_path, @mime_type, CAST(@document_type AS public.pet_document_type), @confidence, @extracted_json, @metadata, timezone('utc', now()), timezone('utc', now()))
              RETURNING id, pet_id, user_id, storage_path, mime_type, document_type::text, confidence, extracted_json::text, metadata::text, created_at, updated_at
              """
            : """
              INSERT INTO public.pet_documents
                (pet_id, user_id, storage_path, mime_type, document_type, confidence, extracted_json, metadata, created_at, updated_at)
              VALUES
                (@pet_id, @user_id, @storage_path, @mime_type, CAST(@document_type AS public.pet_document_type), @confidence, @extracted_json, @metadata, timezone('utc', now()), timezone('utc', now()))
              RETURNING id, pet_id, user_id, storage_path, mime_type, document_type::text, confidence, extracted_json::text, metadata::text, created_at, updated_at
              """;

        await using var cmd = new NpgsqlCommand(sql, conn);

        if (documentId.HasValue)
            cmd.Parameters.AddWithValue("id", documentId.Value);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("user_id", ownerUserId);
        cmd.Parameters.AddWithValue("storage_path", storagePath);
        cmd.Parameters.AddWithValue("mime_type", mimeType);
        cmd.Parameters.AddWithValue("document_type", documentType);
        cmd.Parameters.AddWithValue("confidence", confidence);
        cmd.Parameters.Add(new NpgsqlParameter("extracted_json", NpgsqlDbType.Jsonb) { Value = extractedJson });
        cmd.Parameters.Add(new NpgsqlParameter("metadata", NpgsqlDbType.Jsonb) { Value = metadata == null ? DBNull.Value : metadata });

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            throw new InvalidOperationException("Insert returned no row");

        return new PetDocumentVaultRowDto
        {
            Id = reader.GetGuid(0),
            PetId = reader.GetGuid(1),
            UserId = reader.GetGuid(2),
            StoragePath = reader.GetString(3),
            MimeType = reader.GetString(4),
            DocumentType = reader.GetString(5),
            Confidence = reader.GetDouble(6),
            ExtractedJson = reader.GetString(7),
            Metadata = reader.IsDBNull(8) ? null : reader.GetString(8),
            CreatedAt = reader.GetFieldValue<DateTimeOffset>(9),
            UpdatedAt = reader.GetFieldValue<DateTimeOffset>(10),
        };
    }

    private sealed class ClassificationParse
    {
        public ClassificationParse(string documentType, double confidence, string? reasoning)
        {
            DocumentType = documentType;
            Confidence = confidence;
            Reasoning = reasoning;
        }

        public string? DocumentType { get; set; }
        public double Confidence { get; set; }
        public string? Reasoning { get; set; }
    }
}
