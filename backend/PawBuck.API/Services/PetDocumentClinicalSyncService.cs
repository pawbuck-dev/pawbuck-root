using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class PetDocumentClinicalSyncService : IPetDocumentClinicalSyncService
{
    private const string UniqueViolationSqlState = "23505";
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IOptions<SupabaseOptions> _options;
    private readonly ILogger<PetDocumentClinicalSyncService> _logger;

    public PetDocumentClinicalSyncService(IOptions<SupabaseOptions> options, ILogger<PetDocumentClinicalSyncService> logger)
    {
        _options = options;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<int> ProcessPendingDocumentsAsync(int maxRows, CancellationToken cancellationToken = default)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return 0;

        maxRows = Math.Clamp(maxRows, 1, 100);
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        var ids = new List<(Guid Id, string DocType)>();
        await using (var cmd = new NpgsqlCommand(
                   """
                   SELECT id, document_type::text
                   FROM public.pet_documents
                   WHERE clinical_synced_at IS NULL
                     AND document_type = ANY (ARRAY['vaccinations'::public.pet_document_type, 'medications'::public.pet_document_type])
                   ORDER BY created_at ASC
                   LIMIT @lim
                   """,
                   conn))
        {
            cmd.Parameters.AddWithValue("lim", maxRows);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                ids.Add((reader.GetGuid(0), reader.GetString(1)));
        }

        var processed = 0;
        foreach (var (id, docType) in ids)
        {
            try
            {
                await ProcessOneAsync(conn, id, docType, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "pet_documents {DocumentId}: unhandled sync error", id);
            }

            processed++;
        }

        return processed;
    }

    private async Task ProcessOneAsync(NpgsqlConnection conn, Guid documentId, string documentType, CancellationToken cancellationToken)
    {
        string? extractedJson = null;
        Guid petId = default;
        Guid userId = default;
        string storagePath = "";

        await using (var load = new NpgsqlCommand(
                   """
                   SELECT pet_id, user_id, storage_path, extracted_json::text
                   FROM public.pet_documents
                   WHERE id = @id
                   """,
                   conn))
        {
            load.Parameters.AddWithValue("id", documentId);
            await using var reader = await load.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return;
            petId = reader.GetGuid(0);
            userId = reader.GetGuid(1);
            storagePath = reader.GetString(2);
            extractedJson = reader.IsDBNull(3) ? null : reader.GetString(3);
        }

        if (string.IsNullOrWhiteSpace(extractedJson))
        {
            await MarkSyncedAsync(conn, documentId, "empty extracted_json", cancellationToken);
            return;
        }

        FlexibleVaultExtraction? extraction;
        try
        {
            extraction = JsonSerializer.Deserialize<FlexibleVaultExtraction>(extractedJson, JsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "pet_documents {DocumentId}: invalid JSON", documentId);
            await MarkSyncedAsync(conn, documentId, "invalid JSON", cancellationToken);
            return;
        }

        if (extraction == null)
        {
            await MarkSyncedAsync(conn, documentId, "null extraction", cancellationToken);
            return;
        }

        try
        {
            if (string.Equals(documentType, MiloPetFactsKinds.Vaccinations, StringComparison.OrdinalIgnoreCase))
                await TryInsertVaccinationAsync(conn, petId, userId, storagePath, extraction, cancellationToken);
            else if (string.Equals(documentType, MiloPetFactsKinds.Medications, StringComparison.OrdinalIgnoreCase))
                await TryInsertMedicationAsync(conn, petId, userId, storagePath, extraction, cancellationToken);
            else
            {
                await MarkSyncedAsync(conn, documentId, "unsupported document_type", cancellationToken);
                return;
            }

            await MarkSyncedAsync(conn, documentId, null, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogInformation("pet_documents {DocumentId}: skip insert ({Message})", documentId, ex.Message);
            await MarkSyncedAsync(conn, documentId, ex.Message.Length > 200 ? ex.Message[..200] : ex.Message, cancellationToken);
        }
        catch (PostgresException ex) when (ex.SqlState == UniqueViolationSqlState)
        {
            _logger.LogInformation("pet_documents {DocumentId}: duplicate clinical row ({Message})", documentId, ex.Message);
            await MarkSyncedAsync(conn, documentId, "duplicate", cancellationToken);
        }
    }

    private async Task TryInsertVaccinationAsync(
        NpgsqlConnection conn,
        Guid petId,
        Guid userId,
        string storagePath,
        FlexibleVaultExtraction extraction,
        CancellationToken cancellationToken)
    {
        var name = PickName(extraction, "Vaccination");
        var administered = PickDate(extraction, ["date", "given", "administered", "visit"]);
        if (!administered.HasValue)
            throw new InvalidOperationException("missing_vaccination_date");

        var nextDue = PickDateOnlyFromFacts(extraction, ["next", "due", "expiry", "booster"]);
        var clinic = PickFactValueContaining(extraction, ["clinic", "hospital", "practice"]);
        var notes = string.IsNullOrWhiteSpace(extraction.Summary) ? null : extraction.Summary.Trim();

        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.vaccinations (pet_id, user_id, name, date, next_due_date, clinic_name, notes, document_url, created_at)
            VALUES (@pet_id, @user_id, @name, @date, @next_due, @clinic, @notes, @document_url, timezone('utc', now()))
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("user_id", userId);
        cmd.Parameters.AddWithValue("name", name);
        cmd.Parameters.AddWithValue("date", administered.Value);
        cmd.Parameters.Add(new NpgsqlParameter("next_due", NpgsqlDbType.TimestampTz) { Value = nextDue.HasValue ? nextDue.Value : DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter("clinic", NpgsqlDbType.Text) { Value = string.IsNullOrWhiteSpace(clinic) ? DBNull.Value : clinic });
        cmd.Parameters.Add(new NpgsqlParameter("notes", NpgsqlDbType.Text) { Value = notes == null ? DBNull.Value : notes });
        cmd.Parameters.AddWithValue("document_url", storagePath);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task TryInsertMedicationAsync(
        NpgsqlConnection conn,
        Guid petId,
        Guid userId,
        string storagePath,
        FlexibleVaultExtraction extraction,
        CancellationToken cancellationToken)
    {
        var name = PickName(extraction, "Medication");
        var dosage = PickFactValueContaining(extraction, ["dosage", "dose", "strength", "mg", "ml"]) ?? "See label";
        var frequency = PickFactValueContaining(extraction, ["frequency", "schedule", "how often"]) ?? "As needed";
        var type = "prescription";
        var prescribedBy = PickFactValueContaining(extraction, ["prescribed", "vet", "doctor", "provider"]);
        var purpose = string.IsNullOrWhiteSpace(extraction.Summary) ? null : extraction.Summary.Trim();
        DateTime? start = PickDate(extraction, ["start", "begin", "filled"]);

        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.medicines (
              pet_id, user_id, name, type, dosage, frequency, schedules, reminder_enabled,
              start_date, prescribed_by, purpose, document_url)
            VALUES (
              @pet_id, @user_id, @name, @type, @dosage, @frequency, '[]'::json, false,
              @start_date, @prescribed_by, @purpose, @document_url)
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("user_id", userId);
        cmd.Parameters.AddWithValue("name", name);
        cmd.Parameters.AddWithValue("type", type);
        cmd.Parameters.AddWithValue("dosage", dosage);
        cmd.Parameters.AddWithValue("frequency", frequency);
        cmd.Parameters.Add(new NpgsqlParameter("start_date", NpgsqlDbType.TimestampTz) { Value = start.HasValue ? start.Value : DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter("prescribed_by", NpgsqlDbType.Text) { Value = prescribedBy == null ? DBNull.Value : prescribedBy });
        cmd.Parameters.Add(new NpgsqlParameter("purpose", NpgsqlDbType.Text) { Value = purpose == null ? DBNull.Value : purpose });
        cmd.Parameters.AddWithValue("document_url", storagePath);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task MarkSyncedAsync(NpgsqlConnection conn, Guid documentId, string? error, CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            UPDATE public.pet_documents
            SET clinical_synced_at = timezone('utc', now()),
                clinical_sync_error = @err
            WHERE id = @id
            """,
            conn);
        cmd.Parameters.AddWithValue("id", documentId);
        cmd.Parameters.Add(new NpgsqlParameter("err", NpgsqlDbType.Text) { Value = error == null ? DBNull.Value : error });
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string PickName(FlexibleVaultExtraction e, string fallback)
    {
        if (!string.IsNullOrWhiteSpace(e.Title))
            return e.Title.Trim();
        var v = PickFactValueContaining(e, ["vaccine", "immunization", "product", "medication", "drug", "name"]);
        return string.IsNullOrWhiteSpace(v) ? fallback : v.Trim();
    }

    private static DateTime? PickDate(FlexibleVaultExtraction e, string[] labelNeedles)
    {
        if (TryParseFlexibleDate(e.PrimaryDate, out var d))
            return d;
        foreach (var fact in e.KeyFacts ?? Enumerable.Empty<FlexibleKeyFact>())
        {
            if (string.IsNullOrWhiteSpace(fact.Label))
                continue;
            var lab = fact.Label.Trim();
            if (labelNeedles.Any(n => lab.Contains(n, StringComparison.OrdinalIgnoreCase)))
            {
                if (TryParseFlexibleDate(fact.Value, out d))
                    return d;
            }
        }

        foreach (var fact in e.KeyFacts ?? Enumerable.Empty<FlexibleKeyFact>())
        {
            if (TryParseFlexibleDate(fact.Value, out d))
                return d;
        }

        return null;
    }

    private static DateTime? PickDateOnlyFromFacts(FlexibleVaultExtraction e, string[] labelNeedles)
    {
        foreach (var fact in e.KeyFacts ?? Enumerable.Empty<FlexibleKeyFact>())
        {
            if (string.IsNullOrWhiteSpace(fact.Label))
                continue;
            var lab = fact.Label.Trim();
            if (labelNeedles.Any(n => lab.Contains(n, StringComparison.OrdinalIgnoreCase)))
            {
                if (TryParseFlexibleDate(fact.Value, out var d))
                    return d;
            }
        }

        return null;
    }

    private static string? PickFactValueContaining(FlexibleVaultExtraction e, string[] labelNeedles)
    {
        foreach (var fact in e.KeyFacts ?? Enumerable.Empty<FlexibleKeyFact>())
        {
            if (string.IsNullOrWhiteSpace(fact.Label) || string.IsNullOrWhiteSpace(fact.Value))
                continue;
            if (labelNeedles.Any(n => fact.Label.Contains(n, StringComparison.OrdinalIgnoreCase)))
                return fact.Value.Trim();
        }

        return null;
    }

    private static bool TryParseFlexibleDate(string? raw, out DateTime utc)
    {
        utc = default;
        if (string.IsNullOrWhiteSpace(raw))
            return false;
        var s = raw.Trim();
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dt))
        {
            utc = dt.Kind == DateTimeKind.Utc ? dt : dt.ToUniversalTime();
            return true;
        }

        return false;
    }
}
