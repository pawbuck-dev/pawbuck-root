using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Single-call health “event”: optional document (Milo vision vault) + optional journal note.
/// </summary>
public class MiloHealthBundleService : IMiloHealthBundleService
{
    private readonly IMiloVisionService _vision;
    private readonly IMiloPetFactsService _petFacts;
    private readonly IOptions<SupabaseOptions> _supabaseOptions;
    private readonly ILogger<MiloHealthBundleService> _logger;

    public MiloHealthBundleService(
        IMiloVisionService vision,
        IMiloPetFactsService petFacts,
        IOptions<SupabaseOptions> supabaseOptions,
        ILogger<MiloHealthBundleService> logger)
    {
        _vision = vision;
        _petFacts = petFacts;
        _supabaseOptions = supabaseOptions;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<MiloHealthBundleResponse> ProcessBundleAsync(
        Guid userId,
        string bearerToken,
        MiloHealthBundleRequest request,
        CancellationToken cancellationToken = default)
    {
        var text = request.TextNote?.Trim() ?? "";
        var hasDoc = !string.IsNullOrWhiteSpace(request.DocumentPath);
        if (!hasDoc && string.IsNullOrEmpty(text))
            throw new ArgumentException("Provide a text note and/or a document path.");

        var ok = await _petFacts.VerifyPetAccessAsync(userId, request.PetId, cancellationToken);
        if (!ok)
            throw new UnauthorizedAccessException("Pet not found or access denied");

        var petName = await GetPetNameAsync(request.PetId, cancellationToken) ?? "your pet";

        PetDocumentVaultRowDto? docRow = null;
        if (hasDoc)
        {
            var analyzeReq = new AnalyzePetDocumentRequest
            {
                PetId = request.PetId,
                Bucket = string.IsNullOrWhiteSpace(request.DocumentBucket) ? "pets" : request.DocumentBucket!.Trim(),
                Path = request.DocumentPath!.Trim(),
                MimeType = request.DocumentMimeType,
            };
            docRow = await _vision.AnalyzeAndPersistAsync(userId, bearerToken, analyzeReq, cancellationToken);
            _logger.LogInformation(
                "Health bundle: analyzed document for pet {PetId} type {DocType}",
                request.PetId,
                docRow.DocumentType);
        }

        Guid? journalId = null;
        if (!string.IsNullOrEmpty(text))
        {
            journalId = await InsertJournalEntryAsync(
                request.PetId,
                userId,
                text,
                cancellationToken);
            _logger.LogInformation("Health bundle: journal entry {JournalId} for pet {PetId}", journalId, request.PetId);
        }

        var scenario = hasDoc && !string.IsNullOrEmpty(text)
            ? "hybrid"
            : hasDoc
                ? "file_only"
                : "text_only";

        var routed = new List<string>();
        if (docRow != null)
            routed.Add(SectionLabel(docRow.DocumentType));
        if (journalId != null)
            routed.Add("Journal");

        var confirmation = BuildConfirmation(petName, docRow, journalId.HasValue);

        return new MiloHealthBundleResponse
        {
            Confirmation = confirmation,
            Scenario = scenario,
            RoutedTo = routed,
            Document = docRow,
            JournalEntryId = journalId?.ToString("D"),
        };
    }

    private static string SectionLabel(string documentType)
    {
        return documentType.Trim().ToLowerInvariant() switch
        {
            "vaccinations" => "Vaccines",
            "clinical_exams" => "Clinical visits",
            "lab_results" => "Labs",
            "medications" => "Medications",
            "billing_invoice" => "Clinical visits",
            _ => "Documents",
        };
    }

    private static string BuildConfirmation(string petName, PetDocumentVaultRowDto? doc, bool journalSaved)
    {
        var parts = new List<string>();
        if (doc != null)
        {
            var section = SectionLabel(doc.DocumentType);
            parts.Add(
                $"I've filed this under {section} ({FriendlyDocType(doc.DocumentType)}).");
        }

        if (journalSaved)
            parts.Add($"I've noted that in {petName}'s journal.");

        if (parts.Count == 0)
            return $"Saved for **{petName}**.";

        return string.Join(" ", parts);
    }

    private static string FriendlyDocType(string documentType) =>
        documentType.Trim().ToLowerInvariant() switch
        {
            "vaccinations" => "vaccination record",
            "clinical_exams" => "clinical visit document",
            "lab_results" => "lab report",
            "medications" => "medication record",
            "billing_invoice" => "vet bill / invoice",
            _ => "health document",
        };

    private async Task<string?> GetPetNameAsync(Guid petId, CancellationToken cancellationToken)
    {
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return null;

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT name
            FROM public.pets
            WHERE id = @petId AND deleted_at IS NULL
            LIMIT 1
            """,
            conn);
        cmd.Parameters.AddWithValue("petId", petId);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        return o as string;
    }

    private async Task<Guid> InsertJournalEntryAsync(
        Guid petId,
        Guid userId,
        string note,
        CancellationToken cancellationToken)
    {
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.pet_journal_entries
              (pet_id, user_id, domain, subtype, note, vet_flagged, entry_date, triage_status, linked_clinical_exam_id, created_at, updated_at)
            VALUES
              (@pet_id, @user_id, 'health', 'symptom', @note, false, (timezone('utc', now()))::date, 'active', NULL, timezone('utc', now()), timezone('utc', now()))
            RETURNING id
            """,
            conn);

        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("user_id", userId);
        cmd.Parameters.AddWithValue("note", note);

        var idObj = await cmd.ExecuteScalarAsync(cancellationToken);
        if (idObj is not Guid g)
            throw new InvalidOperationException("Journal insert returned no id");

        return g;
    }
}
