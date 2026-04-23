using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public class MiloPetFactsService : IMiloPetFactsService
{
    private readonly IOptions<SupabaseOptions> _options;

    public MiloPetFactsService(IOptions<SupabaseOptions> options)
    {
        _options = options;
    }

    private NpgsqlConnection CreateConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");
        return new NpgsqlConnection(cs);
    }

    /// <inheritdoc />
    public async Task<bool> VerifyPetOwnershipAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT 1
            FROM public.pets
            WHERE id = @petId
              AND user_id = @userId
              AND deleted_at IS NULL
            LIMIT 1
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("userId", userId);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        return o != null;
    }

    /// <inheritdoc />
    public async Task<string> GetVaccinationsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT name, date, next_due_date, clinic_name, notes
            FROM public.vaccinations
            WHERE pet_id = @petId AND user_id = @userId
            ORDER BY date DESC
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("userId", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        var rows = new List<(string Name, DateTime Date, DateTime? NextDue, string? Clinic, string? Notes)>();
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add((
                reader.GetString(0),
                reader.GetDateTime(1),
                reader.IsDBNull(2) ? null : reader.GetDateTime(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetString(4)));
        }

        return FormatVaccinations(rows);
    }

    /// <inheritdoc />
    public async Task<string> GetMedicationsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT name, type, dosage, frequency, start_date, end_date, prescribed_by, purpose, next_due_date
            FROM public.medicines
            WHERE pet_id = @petId AND user_id = @userId
            ORDER BY created_at DESC
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("userId", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        var rows = new List<MedicineRow>();
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new MedicineRow(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetDateTime(4),
                reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                reader.IsDBNull(6) ? null : reader.GetString(6),
                reader.IsDBNull(7) ? null : reader.GetString(7),
                reader.IsDBNull(8) ? null : reader.GetDateTime(8)));
        }

        return FormatMedications(rows);
    }

    /// <inheritdoc />
    public async Task<string> GetLabResultsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT test_type, lab_name, test_date, ordered_by, results
            FROM public.lab_results
            WHERE pet_id = @petId AND user_id = @userId
            ORDER BY test_date DESC NULLS LAST
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("userId", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        var rows = new List<LabRow>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var testDate = reader.IsDBNull(2) ? (DateTime?)null : reader.GetDateTime(2);
            string? resultsRaw = reader.IsDBNull(4) ? null : reader.GetFieldValue<string>(4);

            rows.Add(new LabRow(
                reader.GetString(0),
                reader.GetString(1),
                testDate,
                reader.IsDBNull(3) ? null : reader.GetString(3),
                resultsRaw));
        }

        return FormatLabResults(rows);
    }

    /// <inheritdoc />
    public async Task<string> GetClinicalExamsTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT exam_type, exam_date, clinic_name, vet_name, weight_value, weight_unit, temperature, heart_rate, respiratory_rate, findings, notes, follow_up_date
            FROM public.clinical_exams
            WHERE pet_id = @petId AND user_id = @userId
            ORDER BY exam_date DESC
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("userId", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        var rows = new List<ExamRow>();
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new ExamRow(
                reader.IsDBNull(0) ? null : reader.GetString(0),
                reader.GetDateTime(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.IsDBNull(4) ? null : reader.GetDecimal(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.IsDBNull(6) ? null : reader.GetDecimal(6),
                reader.IsDBNull(7) ? null : reader.GetInt32(7),
                reader.IsDBNull(8) ? null : reader.GetInt32(8),
                reader.IsDBNull(9) ? null : reader.GetString(9),
                reader.IsDBNull(10) ? null : reader.GetString(10),
                reader.IsDBNull(11) ? null : reader.GetDateTime(11)));
        }

        return FormatClinicalExams(rows);
    }

    /// <inheritdoc />
    public async Task<string> GetJournalEntriesTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT domain, subtype, note, entry_date, created_at
            FROM public.pet_journal_entries
            WHERE pet_id = @petId AND user_id = @userId
            ORDER BY created_at DESC
            LIMIT 5
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("userId", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        var rows = new List<(string Domain, string Subtype, string? Note, DateTime EntryDate)>();
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add((
                reader.GetString(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.GetDateTime(3)));
        }

        return FormatJournalEntries(rows);
    }

    /// <inheritdoc />
    public async Task<string> GetHealthSummaryTextAsync(Guid userId, Guid petId, CancellationToken cancellationToken = default)
    {
        var v = await GetVaccinationsTextAsync(userId, petId, cancellationToken);
        var m = await GetMedicationsTextAsync(userId, petId, cancellationToken);
        var l = await GetLabResultsTextAsync(userId, petId, cancellationToken);
        var e = await GetClinicalExamsTextAsync(userId, petId, cancellationToken);
        return $"""
            === PET HEALTH SUMMARY ===

            {v}

            ---

            {m}

            ---

            {l}

            ---

            {e}
            """;
    }

    private static string FormatVaccinations(
        IReadOnlyList<(string Name, DateTime Date, DateTime? NextDue, string? Clinic, string? Notes)> rows)
    {
        if (rows.Count == 0)
            return "No vaccination records found for this pet.";

        var sb = new StringBuilder();
        sb.Append(CultureInfo.InvariantCulture, $"Vaccination Records ({rows.Count} total):\n\n");
        foreach (var v in rows)
        {
            sb.Append("- ").AppendLine(v.Name);
            sb.Append("  Date: ").AppendLine(v.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            if (v.NextDue.HasValue)
                sb.Append("  Expiry / next due: ").AppendLine(v.NextDue.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            if (!string.IsNullOrWhiteSpace(v.Clinic))
                sb.Append("  Clinic: ").AppendLine(v.Clinic);
            if (!string.IsNullOrWhiteSpace(v.Notes))
                sb.Append("  Notes: ").AppendLine(v.Notes);
            sb.AppendLine();
        }

        return sb.ToString().TrimEnd();
    }

    private sealed record MedicineRow(
        string Name,
        string Type,
        string Dosage,
        string Frequency,
        DateTime? StartDate,
        DateTime? EndDate,
        string? PrescribedBy,
        string? Purpose,
        DateTime? NextDue);

    private static string FormatMedications(IReadOnlyList<MedicineRow> rows)
    {
        if (rows.Count == 0)
            return "No medication records found for this pet.";

        var sb = new StringBuilder();
        sb.Append(CultureInfo.InvariantCulture, $"Medication Records ({rows.Count} total):\n\n");
        foreach (var m in rows)
        {
            sb.Append("- ").Append(m.Name).Append(" (").Append(m.Type).AppendLine(")");
            sb.Append("  Dosage: ").AppendLine(m.Dosage);
            sb.Append("  Frequency: ").AppendLine(m.Frequency);
            if (m.StartDate.HasValue)
                sb.Append("  Start Date: ").AppendLine(m.StartDate.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            if (m.EndDate.HasValue)
                sb.Append("  End Date: ").AppendLine(m.EndDate.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            if (!string.IsNullOrWhiteSpace(m.PrescribedBy))
                sb.Append("  Prescribed By: ").AppendLine(m.PrescribedBy);
            if (!string.IsNullOrWhiteSpace(m.Purpose))
                sb.Append("  Purpose: ").AppendLine(m.Purpose);
            if (m.NextDue.HasValue)
                sb.Append("  Next Due: ").AppendLine(m.NextDue.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            sb.AppendLine();
        }

        return sb.ToString().TrimEnd();
    }

    private sealed record LabRow(
        string TestType,
        string LabName,
        DateTime? TestDate,
        string? OrderedBy,
        string? ResultsJson);

    private static string FormatLabResults(IReadOnlyList<LabRow> rows)
    {
        if (rows.Count == 0)
            return "No lab result records found for this pet.";

        var sb = new StringBuilder();
        sb.Append(CultureInfo.InvariantCulture, $"Lab Results ({rows.Count} total):\n\n");
        foreach (var lr in rows)
        {
            sb.Append("- ").AppendLine(lr.TestType);
            sb.Append("  Lab: ").AppendLine(lr.LabName);
            if (lr.TestDate.HasValue)
                sb.Append("  Date: ").AppendLine(lr.TestDate.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            if (!string.IsNullOrWhiteSpace(lr.OrderedBy))
                sb.Append("  Ordered By: ").AppendLine(lr.OrderedBy);

            if (!string.IsNullOrWhiteSpace(lr.ResultsJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(lr.ResultsJson);
                    var root = doc.RootElement;
                    if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
                    {
                        sb.AppendLine("  Results:");
                        foreach (var el in root.EnumerateArray())
                        {
                            var status = GetStringProp(el, "status") ?? GetStringProp(el, "Status");
                            var testName = GetStringProp(el, "testName") ?? GetStringProp(el, "test_name") ?? "?";
                            var value = GetStringProp(el, "value") ?? "";
                            var unit = GetStringProp(el, "unit") ?? "";
                            var referenceRange = GetStringProp(el, "referenceRange") ?? GetStringProp(el, "reference_range") ?? "";
                            var emoji = status?.ToLowerInvariant() switch
                            {
                                "normal" => "✓",
                                "high" => "↑",
                                "low" => "↓",
                                _ => "•",
                            };
                            sb.Append("    ").Append(emoji).Append(' ').Append(testName).Append(": ").Append(value);
                            if (!string.IsNullOrEmpty(unit))
                                sb.Append(' ').Append(unit);
                            sb.Append(" (Ref: ").Append(referenceRange).AppendLine(")");
                        }
                    }
                }
                catch (JsonException)
                {
                    // skip malformed JSON
                }
            }

            sb.AppendLine();
        }

        return sb.ToString().TrimEnd();
    }

    private static string? GetStringProp(JsonElement el, string name)
    {
        if (el.ValueKind != JsonValueKind.Object || !el.TryGetProperty(name, out var p))
            return null;
        return p.ValueKind == JsonValueKind.String ? p.GetString() : p.ToString();
    }

    private sealed record ExamRow(
        string? ExamType,
        DateTime ExamDate,
        string? ClinicName,
        string? VetName,
        decimal? WeightValue,
        string? WeightUnit,
        decimal? Temperature,
        int? HeartRate,
        int? RespiratoryRate,
        string? Findings,
        string? Notes,
        DateTime? FollowUp);

    private static string FormatClinicalExams(IReadOnlyList<ExamRow> rows)
    {
        if (rows.Count == 0)
            return "No clinical exam records found for this pet.";

        var sb = new StringBuilder();
        sb.Append(CultureInfo.InvariantCulture, $"Clinical Exam Records ({rows.Count} total):\n\n");
        foreach (var e in rows)
        {
            sb.Append("- ").AppendLine(string.IsNullOrWhiteSpace(e.ExamType) ? "General Exam" : e.ExamType);
            sb.Append("  Date: ").AppendLine(e.ExamDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            if (!string.IsNullOrWhiteSpace(e.ClinicName))
                sb.Append("  Clinic: ").AppendLine(e.ClinicName);
            if (!string.IsNullOrWhiteSpace(e.VetName))
                sb.Append("  Vet: ").AppendLine(e.VetName);

            var vitals = new List<string>();
            if (e.WeightValue.HasValue)
                vitals.Add($"Weight: {e.WeightValue} {e.WeightUnit ?? "kg"}");
            if (e.Temperature.HasValue)
                vitals.Add($"Temp: {e.Temperature}°F");
            if (e.HeartRate.HasValue)
                vitals.Add($"HR: {e.HeartRate} bpm");
            if (e.RespiratoryRate.HasValue)
                vitals.Add($"RR: {e.RespiratoryRate}/min");
            if (vitals.Count > 0)
                sb.Append("  Vitals: ").AppendLine(string.Join(", ", vitals));

            if (!string.IsNullOrWhiteSpace(e.Findings))
                sb.Append("  Findings: ").AppendLine(e.Findings);
            if (!string.IsNullOrWhiteSpace(e.Notes))
                sb.Append("  Notes: ").AppendLine(e.Notes);
            if (e.FollowUp.HasValue)
                sb.Append("  Follow-up: ").AppendLine(e.FollowUp.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            sb.AppendLine();
        }

        return sb.ToString().TrimEnd();
    }

    private static string FormatJournalEntries(IReadOnlyList<(string Domain, string Subtype, string? Note, DateTime EntryDate)> rows)
    {
        if (rows.Count == 0)
            return "No recent journal entries for this pet.";

        const int noteMax = 500;
        var sb = new StringBuilder();
        sb.AppendLine("=== RECENT PET JOURNAL (owner notes, up to 5) ===");
        sb.AppendLine();
        foreach (var r in rows)
        {
            sb.Append("- ").Append(r.EntryDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
            sb.Append(" [").Append(r.Domain).Append('/').Append(r.Subtype).AppendLine("]");
            if (!string.IsNullOrWhiteSpace(r.Note))
            {
                var note = r.Note.Length > noteMax ? r.Note[..noteMax] + "…" : r.Note;
                sb.Append("  ").AppendLine(note);
            }

            sb.AppendLine();
        }

        return sb.ToString().TrimEnd();
    }
}
