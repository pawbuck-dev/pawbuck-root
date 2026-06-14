using System.Globalization;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class PetConversationalContextService : IPetConversationalContextService
{
    private readonly IOptions<SupabaseOptions> _options;
    private readonly IMiloPetFactsService _petFacts;
    private readonly ILogger<PetConversationalContextService> _logger;

    public PetConversationalContextService(
        IOptions<SupabaseOptions> options,
        IMiloPetFactsService petFacts,
        ILogger<PetConversationalContextService> logger)
    {
        _options = options;
        _petFacts = petFacts;
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
    public async Task<PetConversationalContextDto?> GetPetConversationalContextAsync(
        Guid userId,
        Guid petId,
        MiloJournalConfigSnapshot config,
        CancellationToken cancellationToken = default)
    {
        if (!await _petFacts.VerifyPetAccessAsync(userId, petId, cancellationToken))
            return null;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        PetProfileSnapshot? profile;
        try
        {
            profile = await LoadProfileAsync(conn, petId, config, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load pet profile for journal context {PetId}", petId);
            return null;
        }

        if (profile == null)
            return null;

        try
        {
            return await BuildContextAsync(conn, petId, config, profile, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Journal conversational context degraded for pet {PetId}; returning profile-only context",
                petId);
            return new PetConversationalContextDto
            {
                PetProfile = profile,
                RecentMedicalHistory = new List<RecentMedicalEvent>(),
                RecentJournalNotes = new List<RecentJournalNote>(),
                UpcomingMilestones = new List<UpcomingMilestone>(),
                BehaviorBaseline = null,
                MedicationsOnFileCount = 0,
                VaccinationsOnFileCount = 0,
            };
        }
    }

    private static async Task<PetConversationalContextDto> BuildContextAsync(
        NpgsqlConnection conn,
        Guid petId,
        MiloJournalConfigSnapshot config,
        PetProfileSnapshot profile,
        CancellationToken cancellationToken)
    {
        var utcNow = DateTime.UtcNow;
        var medicalFrom = utcNow.Date.AddDays(-config.RecentMedicalWindowDays);
        var milestoneTo = utcNow.Date.AddDays(config.UpcomingMilestoneWindowDays);

        var recentMedical = new List<RecentMedicalEvent>();
        recentMedical.AddRange(await LoadRecentVaccinationsAsync(conn, petId, medicalFrom, utcNow.Date, cancellationToken));
        recentMedical.AddRange(await LoadRecentMedicationsAsync(conn, petId, medicalFrom, utcNow.Date, cancellationToken));
        recentMedical.AddRange(await LoadRecentSurgeriesAsync(conn, petId, medicalFrom, utcNow.Date, config.SurgeryExamTypePatterns, cancellationToken));
        recentMedical.AddRange(
            await LoadRecentClinicalExamVisitsNonSurgeryAsync(
                conn,
                petId,
                utcNow.Date.AddDays(-7),
                utcNow.Date,
                config.SurgeryExamTypePatterns,
                cancellationToken));

        var journalNotes = await LoadJournalNotesAsync(conn, petId, config.RecentJournalNotesCount, cancellationToken);
        var milestones = new List<UpcomingMilestone>();
        milestones.AddRange(await LoadUpcomingVaccinationsAsync(conn, petId, utcNow.Date, milestoneTo, cancellationToken));
        milestones.AddRange(await LoadUpcomingExamFollowUpsAsync(conn, petId, utcNow.Date, milestoneTo, cancellationToken));
        milestones.AddRange(await LoadUpcomingVetBookingsAsync(conn, petId, utcNow, cancellationToken));

        var baseline = await LoadBehaviorBaselineAsync(conn, petId, cancellationToken);
        var (medsOnFile, vaxOnFile) = await LoadOnFileMedicationVaccinationCountsAsync(conn, petId, cancellationToken);

        return new PetConversationalContextDto
        {
            PetProfile = profile,
            RecentMedicalHistory = recentMedical,
            RecentJournalNotes = journalNotes,
            UpcomingMilestones = milestones,
            BehaviorBaseline = baseline,
            MedicationsOnFileCount = medsOnFile,
            VaccinationsOnFileCount = vaxOnFile,
        };
    }

    private static async Task<(int Medications, int Vaccinations)> LoadOnFileMedicationVaccinationCountsAsync(
        NpgsqlConnection conn,
        Guid petId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
              (SELECT COUNT(*)::int FROM public.medicines WHERE pet_id = @petId),
              (SELECT COUNT(*)::int FROM public.vaccinations WHERE pet_id = @petId)
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return (0, 0);
        return (reader.GetInt32(0), reader.GetInt32(1));
    }

    private static async Task<BehaviorBaselineSnapshot?> LoadBehaviorBaselineAsync(
        NpgsqlConnection conn,
        Guid petId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT energy_level_1_to_5, social_disposition, food_motivation,
                   typical_deep_sleep_hours, sleep_restfulness, sleep_safe_spot,
                   vocalization_level, vocalization_triggers, stress_triggers
            FROM public.pet_behavior_baselines
            WHERE pet_id = @petId
            LIMIT 1
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return new BehaviorBaselineSnapshot
        {
            EnergyLevel1To5 = reader.GetInt16(0),
            SocialDisposition = reader.GetString(1),
            FoodMotivation = reader.GetString(2),
            TypicalDeepSleepHours = reader.IsDBNull(3) ? null : (double)reader.GetDecimal(3),
            SleepRestfulness = reader.IsDBNull(4) ? null : reader.GetString(4),
            SleepSafeSpot = reader.IsDBNull(5) ? null : reader.GetString(5),
            VocalizationLevel = reader.GetString(6),
            VocalizationTriggers = reader.IsDBNull(7)
                ? new List<string>()
                : new List<string>((string[])reader.GetValue(7)),
            StressTriggers = reader.IsDBNull(8)
                ? new List<string>()
                : new List<string>((string[])reader.GetValue(8)),
        };
    }

    private static async Task<PetProfileSnapshot?> LoadProfileAsync(
        NpgsqlConnection conn,
        Guid petId,
        MiloJournalConfigSnapshot config,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT name, animal_type, breed, date_of_birth, sex, weight_value, weight_unit
            FROM public.pets
            WHERE id = @petId AND deleted_at IS NULL
            LIMIT 1
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        var dob = reader.IsDBNull(3) ? (DateTime?)null : reader.GetDateTime(3);
        double? ageYears = null;
        var ageDisplay = "age unknown";
        var isSenior = false;
        if (dob.HasValue)
        {
            ageYears = CalculateAgeYears(dob.Value, DateTime.UtcNow.Date);
            ageDisplay = FormatAgeDisplay(dob.Value, DateTime.UtcNow.Date);
            isSenior = ageYears >= config.SeniorAgeYears;
        }

        return new PetProfileSnapshot
        {
            Name = reader.GetString(0),
            Species = reader.IsDBNull(1) ? "" : reader.GetString(1),
            Breed = reader.IsDBNull(2) ? "" : reader.GetString(2),
            DateOfBirth = dob?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            AgeYears = ageYears,
            AgeDisplay = ageDisplay,
            IsSenior = isSenior,
            Sex = reader.IsDBNull(4) ? "" : reader.GetString(4),
            WeightValue = reader.IsDBNull(5) ? null : reader.GetDecimal(5),
            WeightUnit = reader.IsDBNull(6) ? null : reader.GetString(6),
        };
    }

    private static double CalculateAgeYears(DateTime dateOfBirth, DateTime todayUtc)
    {
        var years = todayUtc.Year - dateOfBirth.Year;
        if (todayUtc.DayOfYear < dateOfBirth.DayOfYear)
            years--;
        if (years < 0)
            return 0;
        var totalDays = (todayUtc - dateOfBirth.Date).TotalDays;
        return Math.Round(totalDays / 365.25, 1);
    }

    private static string FormatAgeDisplay(DateTime dateOfBirth, DateTime todayUtc)
    {
        var years = todayUtc.Year - dateOfBirth.Year;
        if (todayUtc.DayOfYear < dateOfBirth.DayOfYear)
            years--;
        var months = (todayUtc.Year - dateOfBirth.Year) * 12 + todayUtc.Month - dateOfBirth.Month;
        if (todayUtc.Day < dateOfBirth.Day)
            months--;
        if (years <= 0)
            return $"{Math.Max(0, months)} month(s) old";
        return $"{years} year(s) old";
    }

    private static async Task<List<RecentMedicalEvent>> LoadRecentVaccinationsAsync(
        NpgsqlConnection conn,
        Guid petId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT name, date, notes, clinic_name
            FROM public.vaccinations
            WHERE pet_id = @petId
              AND date >= @fromDate AND date <= @toDate
            ORDER BY date DESC
            """;
        var list = new List<RecentMedicalEvent>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("fromDate", fromDate);
        cmd.Parameters.AddWithValue("toDate", toDate);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var date = reader.GetDateTime(1);
            var details = new StringBuilder();
            if (!reader.IsDBNull(3) && !string.IsNullOrWhiteSpace(reader.GetString(3)))
                details.Append("Clinic: ").Append(reader.GetString(3));
            if (!reader.IsDBNull(2) && !string.IsNullOrWhiteSpace(reader.GetString(2)))
            {
                if (details.Length > 0) details.Append("; ");
                details.Append(reader.GetString(2));
            }

            list.Add(new RecentMedicalEvent
            {
                Type = "vaccination",
                Name = reader.GetString(0),
                Date = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Details = details.Length > 0 ? details.ToString() : null,
            });
        }

        return list;
    }

    private static async Task<List<RecentMedicalEvent>> LoadRecentMedicationsAsync(
        NpgsqlConnection conn,
        Guid petId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT name, type, COALESCE((start_date AT TIME ZONE 'UTC')::date, created_at::date) AS start_day,
                   purpose, prescribed_by
            FROM public.medicines
            WHERE pet_id = @petId
              AND COALESCE((start_date AT TIME ZONE 'UTC')::date, created_at::date) >= @fromDate
              AND COALESCE((start_date AT TIME ZONE 'UTC')::date, created_at::date) <= @toDate
            ORDER BY start_day DESC
            """;
        var list = new List<RecentMedicalEvent>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("fromDate", fromDate);
        cmd.Parameters.AddWithValue("toDate", toDate);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var details = new StringBuilder();
            details.Append(reader.GetString(1));
            if (!reader.IsDBNull(3) && !string.IsNullOrWhiteSpace(reader.GetString(3)))
                details.Append(" — ").Append(reader.GetString(3));
            if (!reader.IsDBNull(4) && !string.IsNullOrWhiteSpace(reader.GetString(4)))
                details.Append(" (").Append(reader.GetString(4)).Append(')');

            list.Add(new RecentMedicalEvent
            {
                Type = "medication_started",
                Name = reader.GetString(0),
                Date = reader.GetDateTime(2).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Details = details.ToString(),
            });
        }

        return list;
    }

    private static async Task<List<RecentMedicalEvent>> LoadRecentSurgeriesAsync(
        NpgsqlConnection conn,
        Guid petId,
        DateTime fromDate,
        DateTime toDate,
        IReadOnlyList<string> patterns,
        CancellationToken cancellationToken)
    {
        if (patterns.Count == 0)
            return new List<RecentMedicalEvent>();

        var or = new StringBuilder();
        for (var i = 0; i < patterns.Count; i++)
        {
            if (i > 0)
                or.Append(" OR ");
            or.Append("exam_type ILIKE @p").Append(i);
        }

        var sql = $"""
            SELECT COALESCE(exam_type, 'Visit'), exam_date, clinic_name, findings, notes
            FROM public.clinical_exams
            WHERE pet_id = @petId
              AND exam_date >= @fromDate AND exam_date <= @toDate
              AND ({or})
            ORDER BY exam_date DESC
            """;

        var list = new List<RecentMedicalEvent>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("fromDate", fromDate);
        cmd.Parameters.AddWithValue("toDate", toDate);
        for (var i = 0; i < patterns.Count; i++)
            cmd.Parameters.AddWithValue("p" + i, "%" + patterns[i].Trim() + "%");

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var details = new StringBuilder();
            if (!reader.IsDBNull(2) && !string.IsNullOrWhiteSpace(reader.GetString(2)))
                details.Append(reader.GetString(2));
            if (!reader.IsDBNull(3) && !string.IsNullOrWhiteSpace(reader.GetString(3)))
            {
                if (details.Length > 0) details.Append("; ");
                details.Append(reader.GetString(3));
            }

            list.Add(new RecentMedicalEvent
            {
                Type = "surgery",
                Name = reader.GetString(0),
                Date = reader.GetDateTime(1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Details = details.Length > 0 ? details.ToString() : null,
            });
        }

        return list;
    }

    /// <summary>
    /// Routine clinical exams in the last N days that do not match surgery-style exam_type patterns (journal Phase 3).
    /// </summary>
    private static async Task<List<RecentMedicalEvent>> LoadRecentClinicalExamVisitsNonSurgeryAsync(
        NpgsqlConnection conn,
        Guid petId,
        DateTime fromDate,
        DateTime toDate,
        IReadOnlyList<string> surgeryPatterns,
        CancellationToken cancellationToken)
    {
        var list = new List<RecentMedicalEvent>();
        var sql = new StringBuilder(
            """
            SELECT COALESCE(exam_type, 'Visit'), exam_date, clinic_name, findings
            FROM public.clinical_exams
            WHERE pet_id = @petId
              AND exam_date >= @fromDate AND exam_date <= @toDate
            """);

        if (surgeryPatterns.Count > 0)
        {
            sql.Append(" AND NOT (");
            for (var i = 0; i < surgeryPatterns.Count; i++)
            {
                if (i > 0)
                    sql.Append(" OR ");
                sql.Append("exam_type ILIKE @p").Append(i);
            }

            sql.Append(')');
        }

        sql.Append(" ORDER BY exam_date DESC LIMIT 10");

        await using var cmd = new NpgsqlCommand(sql.ToString(), conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("fromDate", fromDate);
        cmd.Parameters.AddWithValue("toDate", toDate);
        for (var i = 0; i < surgeryPatterns.Count; i++)
            cmd.Parameters.AddWithValue("p" + i, "%" + surgeryPatterns[i].Trim() + "%");

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var details = new StringBuilder();
            if (!reader.IsDBNull(2) && !string.IsNullOrWhiteSpace(reader.GetString(2)))
                details.Append(reader.GetString(2));
            if (!reader.IsDBNull(3) && !string.IsNullOrWhiteSpace(reader.GetString(3)))
            {
                if (details.Length > 0) details.Append("; ");
                details.Append(reader.GetString(3));
            }

            list.Add(new RecentMedicalEvent
            {
                Type = "clinical_exam",
                Name = reader.GetString(0),
                Date = reader.GetDateTime(1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Details = details.Length > 0 ? details.ToString() : null,
            });
        }

        return list;
    }

    private static async Task<List<RecentJournalNote>> LoadJournalNotesAsync(
        NpgsqlConnection conn,
        Guid petId,
        int limit,
        CancellationToken cancellationToken)
    {
        var sql = $"""
            SELECT domain, subtype, note, entry_date, created_at
            FROM public.pet_journal_entries
            WHERE pet_id = @petId
            ORDER BY created_at DESC
            LIMIT {Math.Clamp(limit, 1, 20)}
            """;

        var list = new List<RecentJournalNote>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var created = reader.GetDateTime(4);
            list.Add(new RecentJournalNote
            {
                Domain = reader.GetString(0),
                Subtype = reader.GetString(1),
                Note = reader.IsDBNull(2) ? null : reader.GetString(2),
                EntryDate = reader.GetDateTime(3).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                CreatedAt = created.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture),
            });
        }

        return list;
    }

    private static async Task<List<UpcomingMilestone>> LoadUpcomingVaccinationsAsync(
        NpgsqlConnection conn,
        Guid petId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT name, next_due_date, clinic_name
            FROM public.vaccinations
            WHERE pet_id = @petId
              AND next_due_date IS NOT NULL
              AND next_due_date >= @fromDate AND next_due_date <= @toDate
            ORDER BY next_due_date ASC
            """;
        var list = new List<UpcomingMilestone>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("fromDate", fromDate);
        cmd.Parameters.AddWithValue("toDate", toDate);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var due = reader.GetDateTime(1);
            list.Add(new UpcomingMilestone
            {
                Type = "vaccination_due",
                Label = reader.GetString(0),
                DueDate = due.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Details = reader.IsDBNull(2) ? null : reader.GetString(2),
            });
        }

        return list;
    }

    private static async Task<List<UpcomingMilestone>> LoadUpcomingExamFollowUpsAsync(
        NpgsqlConnection conn,
        Guid petId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT COALESCE(exam_type, 'Follow-up'), follow_up_date, clinic_name
            FROM public.clinical_exams
            WHERE pet_id = @petId
              AND follow_up_date IS NOT NULL
              AND follow_up_date >= @fromDate AND follow_up_date <= @toDate
            ORDER BY follow_up_date ASC
            """;
        var list = new List<UpcomingMilestone>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("fromDate", fromDate);
        cmd.Parameters.AddWithValue("toDate", toDate);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var due = reader.GetDateTime(1);
            list.Add(new UpcomingMilestone
            {
                Type = "exam_follow_up",
                Label = reader.GetString(0),
                DueDate = due.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Details = reader.IsDBNull(2) ? null : reader.GetString(2),
            });
        }

        return list;
    }

    private static async Task<List<UpcomingMilestone>> LoadUpcomingVetBookingsAsync(
        NpgsqlConnection conn,
        Guid petId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var toUtc = utcNow.AddDays(30);

        const string sql = """
            SELECT COALESCE(service_label, 'Appointment'), start_utc, clinic_name, status
            FROM public.vet_bookings
            WHERE pet_id = @petId
              AND start_utc >= @fromUtc AND start_utc <= @toUtc
              AND lower(coalesce(status, '')) NOT IN ('cancelled', 'canceled')
            ORDER BY start_utc ASC
            """;
        var list = new List<UpcomingMilestone>();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("fromUtc", utcNow.Kind == DateTimeKind.Utc ? utcNow : DateTime.SpecifyKind(utcNow, DateTimeKind.Utc));
        cmd.Parameters.AddWithValue("toUtc", toUtc.Kind == DateTimeKind.Utc ? toUtc : DateTime.SpecifyKind(toUtc, DateTimeKind.Utc));
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var start = reader.GetDateTime(1);
            var details = reader.IsDBNull(2) ? null : reader.GetString(2);
            if (!reader.IsDBNull(3))
            {
                var st = reader.GetString(3);
                details = string.IsNullOrEmpty(details) ? st : $"{details} ({st})";
            }

            list.Add(new UpcomingMilestone
            {
                Type = "vet_booking",
                Label = reader.GetString(0),
                DueDate = start.ToUniversalTime().ToString("o", CultureInfo.InvariantCulture),
                Details = details,
            });
        }

        return list;
    }
}
