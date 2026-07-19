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

    private static readonly HashSet<string> SyncableDocumentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        MiloPetFactsKinds.Vaccinations,
        MiloPetFactsKinds.Medications,
        MiloPetFactsKinds.ClinicalExams,
        MiloPetFactsKinds.LabResults,
    };

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

        var ids = new List<Guid>();
        await using (var cmd = new NpgsqlCommand(
                   """
                   SELECT pd.id
                   FROM public.pet_documents pd
                   WHERE pd.document_type::text = ANY (@types)
                     AND (
                       pd.clinical_synced_at IS NULL
                       OR (
                         pd.document_type::text = 'vaccinations'
                         AND NOT EXISTS (
                           SELECT 1 FROM public.vaccinations v
                           WHERE v.pet_id = pd.pet_id AND v.document_url = pd.storage_path
                         )
                       )
                       OR (
                         pd.document_type::text = 'medications'
                         AND NOT EXISTS (
                           SELECT 1 FROM public.medicines m
                           WHERE m.pet_id = pd.pet_id AND m.document_url = pd.storage_path
                         )
                       )
                       OR (
                         pd.document_type::text = 'clinical_exams'
                         AND NOT EXISTS (
                           SELECT 1 FROM public.clinical_exams ce
                           WHERE ce.pet_id = pd.pet_id AND ce.document_url = pd.storage_path
                         )
                       )
                       OR (
                         pd.document_type::text = 'lab_results'
                         AND NOT EXISTS (
                           SELECT 1 FROM public.lab_results lr
                           WHERE lr.pet_id = pd.pet_id AND lr.document_url = pd.storage_path
                         )
                       )
                     )
                   ORDER BY CASE WHEN pd.clinical_synced_at IS NULL THEN 0 ELSE 1 END, pd.created_at ASC
                   LIMIT @lim
                   """,
                   conn))
        {
            cmd.Parameters.AddWithValue("types", SyncableDocumentTypes.ToArray());
            cmd.Parameters.AddWithValue("lim", maxRows);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                ids.Add(reader.GetGuid(0));
        }

        var processed = 0;
        foreach (var id in ids)
        {
            try
            {
                await SyncDocumentByIdAsync(id, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "pet_documents {DocumentId}: unhandled sync error", id);
            }

            processed++;
        }

        return processed;
    }

    /// <inheritdoc />
    public async Task<PetDocumentClinicalSyncResult> ResyncDocumentByIdAsync(Guid documentId, CancellationToken cancellationToken = default)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return new PetDocumentClinicalSyncResult { Error = "database_not_configured" };

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        Guid petId = default;
        string storagePath = "";

        await using (var load = new NpgsqlCommand(
                   """
                   SELECT pet_id, storage_path
                   FROM public.pet_documents
                   WHERE id = @id
                   """,
                   conn))
        {
            load.Parameters.AddWithValue("id", documentId);
            await using var reader = await load.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return new PetDocumentClinicalSyncResult { Error = "document_not_found" };

            petId = reader.GetGuid(0);
            storagePath = reader.GetString(1);
        }

        await DeleteClinicalRowsForDocumentAsync(conn, petId, storagePath, cancellationToken);

        await using (var reset = new NpgsqlCommand(
                   """
                   UPDATE public.pet_documents
                   SET clinical_synced_at = NULL,
                       clinical_sync_error = NULL
                   WHERE id = @id
                   """,
                   conn))
        {
            reset.Parameters.AddWithValue("id", documentId);
            await reset.ExecuteNonQueryAsync(cancellationToken);
        }

        return await SyncDocumentByIdAsync(documentId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<PetDocumentClinicalSyncResult> SyncDocumentByIdAsync(Guid documentId, CancellationToken cancellationToken = default)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return new PetDocumentClinicalSyncResult { Error = "database_not_configured" };

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        string? docType = null;
        string? extractedJson = null;
        Guid petId = default;
        Guid userId = default;
        string storagePath = "";
        DateTimeOffset? syncedAt = null;

        await using (var load = new NpgsqlCommand(
                   """
                   SELECT pet_id, user_id, storage_path, document_type::text, extracted_json::text, clinical_synced_at
                   FROM public.pet_documents
                   WHERE id = @id
                   """,
                   conn))
        {
            load.Parameters.AddWithValue("id", documentId);
            await using var reader = await load.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return new PetDocumentClinicalSyncResult { Error = "document_not_found" };

            petId = reader.GetGuid(0);
            userId = reader.GetGuid(1);
            storagePath = reader.GetString(2);
            docType = reader.GetString(3);
            extractedJson = reader.IsDBNull(4) ? null : reader.GetString(4);
            syncedAt = reader.IsDBNull(5) ? null : reader.GetFieldValue<DateTimeOffset>(5);
        }

        if (syncedAt.HasValue)
        {
            if (ClinicalDocumentSyncPolicy.ShouldSkipSync(
                    clinicalSyncedAtSet: true,
                    clinicalRowsExistForDocument: await ClinicalRowsExistForDocumentAsync(
                        conn, petId, storagePath, docType, cancellationToken)))
            {
                return new PetDocumentClinicalSyncResult { Synced = true };
            }

            _logger.LogInformation(
                "pet_documents {DocumentId}: marked synced but no {DocType} rows for storage path; re-syncing",
                documentId,
                docType);
        }

        if (string.IsNullOrWhiteSpace(docType) || !SyncableDocumentTypes.Contains(docType))
        {
            await MarkSyncedAsync(conn, documentId, "unsupported document_type", cancellationToken);
            return new PetDocumentClinicalSyncResult { Synced = true, Error = "unsupported_document_type" };
        }

        if (string.IsNullOrWhiteSpace(extractedJson))
        {
            await MarkSyncedAsync(conn, documentId, "empty extracted_json", cancellationToken);
            return new PetDocumentClinicalSyncResult { Synced = true, Error = "empty extracted_json" };
        }

        var result = new PetDocumentClinicalSyncResult();
        try
        {
            var isVaccinationsDoc = string.Equals(docType, MiloPetFactsKinds.Vaccinations, StringComparison.OrdinalIgnoreCase);

            if (VaultExtractedJsonParser.TryParseMedicalRecord(extractedJson, out var medical) && medical != null)
            {
                await SyncMedicalRecordAsync(conn, petId, userId, storagePath, docType, medical, result, cancellationToken);
            }
            else if (isVaccinationsDoc)
            {
                throw new InvalidOperationException("missing_vaccination_items");
            }
            else if (VaultExtractedJsonParser.TryParseFlexible(extractedJson, out var flexible) && flexible != null)
            {
                await SyncLegacyFlexibleAsync(conn, petId, userId, storagePath, docType, flexible, result, cancellationToken);
            }
            else
            {
                await MarkSyncedAsync(conn, documentId, "invalid JSON", cancellationToken);
                return new PetDocumentClinicalSyncResult { Synced = true, Error = "invalid_json" };
            }

            var syncError = result.ClinicalRowsCreated == 0 && result.SkippedDuplicates == 0
                ? "no_clinical_rows_created"
                : null;
            await MarkSyncedAsync(conn, documentId, syncError, cancellationToken);
            result.Synced = true;
            if (syncError != null)
                result.Error = syncError;
            return result;
        }
        catch (PostgresException ex) when (ex.SqlState == UniqueViolationSqlState)
        {
            _logger.LogInformation("pet_documents {DocumentId}: duplicate clinical row ({Message})", documentId, ex.Message);
            await MarkSyncedAsync(conn, documentId, "duplicate", cancellationToken);
            result.Synced = true;
            result.Error = "duplicate";
            return result;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogInformation("pet_documents {DocumentId}: skip insert ({Message})", documentId, ex.Message);
            await MarkSyncedAsync(conn, documentId, TruncateError(ex.Message), cancellationToken);
            result.Synced = true;
            result.Error = TruncateError(ex.Message);
            return result;
        }
    }

    private static async Task SyncMedicalRecordAsync(
        NpgsqlConnection conn,
        Guid petId,
        Guid userId,
        string storagePath,
        string documentType,
        MedicalRecordExtraction medical,
        PetDocumentClinicalSyncResult result,
        CancellationToken cancellationToken)
    {
        var visitDate = VaultExtractedJsonParser.ParseOptionalDate(medical.DateOfVisit);
        var clinic = string.IsNullOrWhiteSpace(medical.ClinicName) ? null : medical.ClinicName.Trim();
        var items = medical.Items ?? new List<MedicalRecordItem>();

        if (string.Equals(documentType, MiloPetFactsKinds.Vaccinations, StringComparison.OrdinalIgnoreCase))
        {
            var vaccinationItems = VaultExtractedJsonParser.FilterVaccinationItems(items);
            if (vaccinationItems.Count == 0)
                throw new InvalidOperationException("missing_vaccination_items");

            foreach (var item in vaccinationItems)
            {
                if (!VaultExtractedJsonParser.TryGetItemAdministeredDate(item, out var administered))
                    continue;

                var nextDue = VaultExtractedJsonParser.ParseOptionalDate(item.ExpiryDate);
                if (await VaccinationExistsAsync(conn, petId, item.Name, administered, cancellationToken))
                {
                    result.SkippedDuplicates++;
                    continue;
                }

                await InsertVaccinationAsync(
                    conn, petId, userId, item.Name.Trim(), administered, nextDue, clinic, null, storagePath, cancellationToken);
                result.VaccinationsCreated++;
            }

            return;
        }

        if (string.Equals(documentType, MiloPetFactsKinds.Medications, StringComparison.OrdinalIgnoreCase))
        {
            if (items.Count == 0)
                throw new InvalidOperationException("missing_medication_items");

            foreach (var item in items)
            {
                if (string.IsNullOrWhiteSpace(item.Name))
                    continue;

                if (await MedicationExistsAsync(conn, petId, item.Name, visitDate, cancellationToken))
                {
                    result.SkippedDuplicates++;
                    continue;
                }

                await InsertMedicationAsync(
                    conn,
                    petId,
                    userId,
                    item.Name.Trim(),
                    visitDate,
                    VaultExtractedJsonParser.ParseOptionalDate(item.ExpiryDate),
                    clinic,
                    storagePath,
                    cancellationToken);
                result.MedicationsCreated++;
            }

            return;
        }

        if (string.Equals(documentType, MiloPetFactsKinds.ClinicalExams, StringComparison.OrdinalIgnoreCase))
        {
            var examDate = VaultExtractedJsonParser.ParseOptionalDateOnly(medical.DateOfVisit)
                           ?? DateOnly.FromDateTime(DateTime.UtcNow.Date);

            // A clinical-visit document can also list administered vaccines (mixed document).
            // Divert explicitly vaccine-tagged items to public.vaccinations so they show in
            // the Vaccinations section instead of rendering as exam cards.
            var (vaccineItems, examItems) = VaultExtractedJsonParser.PartitionExplicitVaccinationItems(items);

            foreach (var item in vaccineItems)
            {
                // Prefer the item's own administered date; fall back to the visit date
                // (vaccines listed on a visit summary were given at that visit).
                if (!VaultExtractedJsonParser.TryGetItemAdministeredDate(item, out var administered))
                {
                    if (!visitDate.HasValue)
                    {
                        examItems.Add(item);
                        continue;
                    }

                    administered = visitDate.Value;
                }

                if (await VaccinationExistsAsync(conn, petId, item.Name, administered, cancellationToken))
                {
                    result.SkippedDuplicates++;
                    continue;
                }

                var nextDue = VaultExtractedJsonParser.ParseOptionalDate(item.ExpiryDate);
                await InsertVaccinationAsync(
                    conn, petId, userId, item.Name.Trim(), administered, nextDue, clinic, null, storagePath, cancellationToken);
                result.VaccinationsCreated++;
            }

            if (examItems.Count == 0)
            {
                // All items were vaccines (or none extracted) — still record the visit itself.
                var examType = "Clinical visit";
                if (await ClinicalExamExistsAsync(conn, petId, examType, examDate, cancellationToken))
                {
                    result.SkippedDuplicates++;
                    return;
                }

                await InsertClinicalExamAsync(
                    conn, petId, userId, examDate, examType, clinic, null, null, storagePath, cancellationToken);
                result.ClinicalExamsCreated++;
                return;
            }

            foreach (var item in examItems)
            {
                var examType = item.Name.Trim();
                if (await ClinicalExamExistsAsync(conn, petId, examType, examDate, cancellationToken))
                {
                    result.SkippedDuplicates++;
                    continue;
                }

                var followUp = VaultExtractedJsonParser.ParseOptionalDateOnly(item.ExpiryDate);
                await InsertClinicalExamAsync(
                    conn, petId, userId, examDate, examType, clinic, followUp, item.Category, storagePath, cancellationToken);
                result.ClinicalExamsCreated++;
            }

            return;
        }

        if (string.Equals(documentType, MiloPetFactsKinds.LabResults, StringComparison.OrdinalIgnoreCase))
        {
            var testDate = visitDate;
            var labName = clinic ?? "Unknown lab";

            if (items.Count == 0)
            {
                if (await LabResultExistsAsync(conn, petId, "Lab panel", testDate, cancellationToken))
                {
                    result.SkippedDuplicates++;
                    return;
                }

                await InsertLabResultAsync(conn, petId, userId, "Lab panel", labName, testDate, storagePath, cancellationToken);
                result.LabResultsCreated++;
                return;
            }

            foreach (var item in items)
            {
                if (string.IsNullOrWhiteSpace(item.Name))
                    continue;

                var testType = item.Name.Trim();
                if (await LabResultExistsAsync(conn, petId, testType, testDate, cancellationToken))
                {
                    result.SkippedDuplicates++;
                    continue;
                }

                await InsertLabResultAsync(conn, petId, userId, testType, labName, testDate, storagePath, cancellationToken);
                result.LabResultsCreated++;
            }
        }
    }

    private static async Task SyncLegacyFlexibleAsync(
        NpgsqlConnection conn,
        Guid petId,
        Guid userId,
        string storagePath,
        string documentType,
        FlexibleVaultExtraction flexible,
        PetDocumentClinicalSyncResult result,
        CancellationToken cancellationToken)
    {
        if (string.Equals(documentType, MiloPetFactsKinds.Medications, StringComparison.OrdinalIgnoreCase))
        {
            var name = PickName(flexible, "Medication");
            if (await MedicationExistsAsync(conn, petId, name, PickDate(flexible, ["start", "begin", "filled"]), cancellationToken))
            {
                result.SkippedDuplicates++;
                return;
            }

            await InsertMedicationAsync(
                conn,
                petId,
                userId,
                name,
                PickDate(flexible, ["start", "begin", "filled"]),
                null,
                PickFactValueContaining(flexible, ["prescribed", "vet", "clinic"]),
                storagePath,
                cancellationToken);
            result.MedicationsCreated++;
        }
    }

    private static async Task InsertVaccinationAsync(
        NpgsqlConnection conn,
        Guid petId,
        Guid userId,
        string name,
        DateTime administered,
        DateTime? nextDue,
        string? clinic,
        string? notes,
        string storagePath,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.vaccinations (pet_id, user_id, name, date, next_due_date, clinic_name, notes, document_url, created_at)
            VALUES (@pet_id, @user_id, @name, @date, @next_due, @clinic, @notes, @document_url, timezone('utc', now()))
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("user_id", userId);
        cmd.Parameters.AddWithValue("name", name);
        cmd.Parameters.AddWithValue("date", administered);
        cmd.Parameters.Add(new NpgsqlParameter("next_due", NpgsqlDbType.TimestampTz) { Value = nextDue.HasValue ? nextDue.Value : DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter("clinic", NpgsqlDbType.Text) { Value = string.IsNullOrWhiteSpace(clinic) ? DBNull.Value : clinic });
        cmd.Parameters.Add(new NpgsqlParameter("notes", NpgsqlDbType.Text) { Value = notes == null ? DBNull.Value : notes });
        cmd.Parameters.AddWithValue("document_url", storagePath);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task InsertMedicationAsync(
        NpgsqlConnection conn,
        Guid petId,
        Guid userId,
        string name,
        DateTime? start,
        DateTime? nextDue,
        string? prescribedBy,
        string storagePath,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.medicines (
              pet_id, user_id, name, type, dosage, frequency, schedules, reminder_enabled,
              start_date, next_due_date, prescribed_by, document_url)
            VALUES (
              @pet_id, @user_id, @name, @type, @dosage, @frequency, '[]'::json, false,
              @start_date, @next_due, @prescribed_by, @document_url)
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("user_id", userId);
        cmd.Parameters.AddWithValue("name", name);
        cmd.Parameters.AddWithValue("type", "prescription");
        cmd.Parameters.AddWithValue("dosage", "See label");
        cmd.Parameters.AddWithValue("frequency", "As directed");
        cmd.Parameters.Add(new NpgsqlParameter("start_date", NpgsqlDbType.TimestampTz) { Value = start.HasValue ? start.Value : DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter("next_due", NpgsqlDbType.TimestampTz) { Value = nextDue.HasValue ? nextDue.Value : DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter("prescribed_by", NpgsqlDbType.Text) { Value = string.IsNullOrWhiteSpace(prescribedBy) ? DBNull.Value : prescribedBy });
        cmd.Parameters.AddWithValue("document_url", storagePath);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task InsertClinicalExamAsync(
        NpgsqlConnection conn,
        Guid petId,
        Guid userId,
        DateOnly examDate,
        string examType,
        string? clinic,
        DateOnly? followUp,
        string? findings,
        string storagePath,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.clinical_exams (
              pet_id, user_id, exam_date, clinic_name, exam_type, findings, follow_up_date, document_url, created_at, updated_at)
            VALUES (
              @pet_id, @user_id, @exam_date, @clinic, @exam_type, @findings, @follow_up, @document_url, timezone('utc', now()), timezone('utc', now()))
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("user_id", userId);
        cmd.Parameters.AddWithValue("exam_date", examDate);
        cmd.Parameters.Add(new NpgsqlParameter("clinic", NpgsqlDbType.Text) { Value = string.IsNullOrWhiteSpace(clinic) ? DBNull.Value : clinic });
        cmd.Parameters.AddWithValue("exam_type", examType);
        cmd.Parameters.Add(new NpgsqlParameter("findings", NpgsqlDbType.Text) { Value = string.IsNullOrWhiteSpace(findings) ? DBNull.Value : findings });
        cmd.Parameters.Add(new NpgsqlParameter("follow_up", NpgsqlDbType.Date) { Value = followUp.HasValue ? followUp.Value : DBNull.Value });
        cmd.Parameters.AddWithValue("document_url", storagePath);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task InsertLabResultAsync(
        NpgsqlConnection conn,
        Guid petId,
        Guid userId,
        string testType,
        string labName,
        DateTime? testDate,
        string storagePath,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.lab_results (
              pet_id, user_id, test_type, lab_name, test_date, results, document_url, created_at, updated_at)
            VALUES (
              @pet_id, @user_id, @test_type, @lab_name, @test_date, '[]'::jsonb, @document_url, timezone('utc', now()), timezone('utc', now()))
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("user_id", userId);
        cmd.Parameters.AddWithValue("test_type", testType);
        cmd.Parameters.AddWithValue("lab_name", labName);
        cmd.Parameters.Add(new NpgsqlParameter("test_date", NpgsqlDbType.TimestampTz) { Value = testDate.HasValue ? testDate.Value : DBNull.Value });
        cmd.Parameters.AddWithValue("document_url", storagePath);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<bool> ClinicalRowsExistForDocumentAsync(
        NpgsqlConnection conn,
        Guid petId,
        string storagePath,
        string? documentType,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(documentType) || string.IsNullOrWhiteSpace(storagePath))
            return false;

        var sql = documentType.ToLowerInvariant() switch
        {
            MiloPetFactsKinds.Vaccinations => """
                SELECT 1 FROM public.vaccinations
                WHERE pet_id = @pet_id AND document_url = @path
                LIMIT 1
                """,
            MiloPetFactsKinds.Medications => """
                SELECT 1 FROM public.medicines
                WHERE pet_id = @pet_id AND document_url = @path
                LIMIT 1
                """,
            MiloPetFactsKinds.ClinicalExams => """
                SELECT 1 FROM public.clinical_exams
                WHERE pet_id = @pet_id AND document_url = @path
                LIMIT 1
                """,
            MiloPetFactsKinds.LabResults => """
                SELECT 1 FROM public.lab_results
                WHERE pet_id = @pet_id AND document_url = @path
                LIMIT 1
                """,
            _ => null,
        };

        if (sql == null)
            return false;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("path", storagePath);
        return await cmd.ExecuteScalarAsync(cancellationToken) != null;
    }

    private static async Task<bool> VaccinationExistsAsync(
        NpgsqlConnection conn,
        Guid petId,
        string name,
        DateTime date,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT 1 FROM public.vaccinations
            WHERE pet_id = @pet_id
              AND lower(trim(name)) = lower(trim(@name))
              AND (date AT TIME ZONE 'UTC')::date = (@date AT TIME ZONE 'UTC')::date
            LIMIT 1
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("name", name);
        cmd.Parameters.AddWithValue("date", date);
        return await cmd.ExecuteScalarAsync(cancellationToken) != null;
    }

    private static async Task<bool> MedicationExistsAsync(
        NpgsqlConnection conn,
        Guid petId,
        string name,
        DateTime? start,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT 1 FROM public.medicines
            WHERE pet_id = @pet_id
              AND lower(trim(name)) = lower(trim(@name))
              AND (
                @start IS NULL
                OR COALESCE((start_date AT TIME ZONE 'UTC')::date, created_at::date) = (@start AT TIME ZONE 'UTC')::date
              )
            LIMIT 1
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("name", name);
        cmd.Parameters.Add(new NpgsqlParameter("start", NpgsqlDbType.TimestampTz) { Value = start.HasValue ? start.Value : DBNull.Value });
        return await cmd.ExecuteScalarAsync(cancellationToken) != null;
    }

    private static async Task<bool> ClinicalExamExistsAsync(
        NpgsqlConnection conn,
        Guid petId,
        string examType,
        DateOnly examDate,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT 1 FROM public.clinical_exams
            WHERE pet_id = @pet_id
              AND lower(trim(exam_type)) = lower(trim(@exam_type))
              AND exam_date = @exam_date
            LIMIT 1
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("exam_type", examType);
        cmd.Parameters.AddWithValue("exam_date", examDate);
        return await cmd.ExecuteScalarAsync(cancellationToken) != null;
    }

    private static async Task<bool> LabResultExistsAsync(
        NpgsqlConnection conn,
        Guid petId,
        string testType,
        DateTime? testDate,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT 1 FROM public.lab_results
            WHERE pet_id = @pet_id
              AND lower(trim(test_type)) = lower(trim(@test_type))
              AND (
                @test_date IS NULL
                OR (test_date AT TIME ZONE 'UTC')::date = (@test_date AT TIME ZONE 'UTC')::date
              )
            LIMIT 1
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("test_type", testType);
        cmd.Parameters.Add(new NpgsqlParameter("test_date", NpgsqlDbType.TimestampTz) { Value = testDate.HasValue ? testDate.Value : DBNull.Value });
        return await cmd.ExecuteScalarAsync(cancellationToken) != null;
    }

    private static async Task DeleteClinicalRowsForDocumentAsync(
        NpgsqlConnection conn,
        Guid petId,
        string storagePath,
        CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            DELETE FROM public.vaccinations WHERE pet_id = @pet_id AND document_url = @path;
            DELETE FROM public.medicines WHERE pet_id = @pet_id AND document_url = @path;
            DELETE FROM public.clinical_exams WHERE pet_id = @pet_id AND document_url = @path;
            DELETE FROM public.lab_results WHERE pet_id = @pet_id AND document_url = @path;
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("path", storagePath);
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

    private static string TruncateError(string message) =>
        message.Length > 200 ? message[..200] : message;

    private static string PickName(FlexibleVaultExtraction e, string fallback)
    {
        if (!string.IsNullOrWhiteSpace(e.Title))
            return e.Title.Trim();
        var v = PickFactValueContaining(e, ["vaccine", "immunization", "product", "medication", "drug", "name"]);
        return string.IsNullOrWhiteSpace(v) ? fallback : v.Trim();
    }

    private static DateTime? PickDate(FlexibleVaultExtraction e, string[] labelNeedles)
    {
        if (VaultExtractedJsonParser.TryParseFlexibleDate(e.PrimaryDate, out var d))
            return d;
        foreach (var fact in e.KeyFacts ?? Enumerable.Empty<FlexibleKeyFact>())
        {
            if (string.IsNullOrWhiteSpace(fact.Label))
                continue;
            if (labelNeedles.Any(n => fact.Label.Contains(n, StringComparison.OrdinalIgnoreCase))
                && VaultExtractedJsonParser.TryParseFlexibleDate(fact.Value, out d))
                return d;
        }

        foreach (var fact in e.KeyFacts ?? Enumerable.Empty<FlexibleKeyFact>())
        {
            if (VaultExtractedJsonParser.TryParseFlexibleDate(fact.Value, out d))
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
            if (labelNeedles.Any(n => fact.Label.Contains(n, StringComparison.OrdinalIgnoreCase))
                && VaultExtractedJsonParser.TryParseFlexibleDate(fact.Value, out var d))
                return d;
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
}
