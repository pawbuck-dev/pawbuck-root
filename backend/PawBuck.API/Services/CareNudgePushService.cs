using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Configuration;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class CareNudgePushService : ICareNudgePushService
{
    private readonly IOptions<SupabaseOptions> _options;
    private readonly IOptionsMonitor<CareNudgesOptions> _nudgeOptions;
    private readonly ICareNudgeService _nudgeService;
    private readonly IExpoPushService _expoPush;
    private readonly ILogger<CareNudgePushService> _logger;

    public CareNudgePushService(
        IOptions<SupabaseOptions> options,
        IOptionsMonitor<CareNudgesOptions> nudgeOptions,
        ICareNudgeService nudgeService,
        IExpoPushService expoPush,
        ILogger<CareNudgePushService> logger)
    {
        _options = options;
        _nudgeOptions = nudgeOptions;
        _nudgeService = nudgeService;
        _expoPush = expoPush;
        _logger = logger;
    }

    public async Task<CareNudgeRunResultDto> RunPushCycleAsync(CancellationToken cancellationToken = default)
    {
        var opts = _nudgeOptions.CurrentValue;
        if (!opts.Enabled || !opts.PushEnabled)
            return new CareNudgeRunResultDto();

        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return new CareNudgeRunResultDto();

        var utcNow = DateTime.UtcNow;
        var userIds = await LoadActiveUserIdsAsync(cs, cancellationToken);
        var digestsSent = 0;
        var vetSent = 0;
        var docSent = 0;

        foreach (var userId in userIds)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var nudges = (await _nudgeService.GetNudgesForUserAsync(userId, cancellationToken)).ToList();
            await AppendDocumentExpiryNudgesAsync(cs, userId, nudges, utcNow, cancellationToken);
            await AppendSeniorMobilityNudgesAsync(cs, userId, nudges, opts, cancellationToken);

            if (ShouldSendDailyDigest(opts, utcNow))
            {
                var digest = CareNudgeRules.BuildDailyDigest(nudges, userId, utcNow);
                if (digest != null && await TryClaimDeliveryAsync(cs, userId, digest.DedupeKey, "push", cancellationToken))
                {
                    await _expoPush.SendToUserAsync(
                        userId,
                        digest.Title,
                        digest.Body,
                        new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["notificationKind"] = "care_nudge_digest",
                            ["url"] = "/(home)",
                            ["nudgeCount"] = digest.NudgeCount.ToString(),
                        },
                        cancellationToken);
                    digestsSent++;
                }
            }

            vetSent += await SendVetRemindersAsync(cs, userId, utcNow, cancellationToken);
        }

        docSent += await SendDocumentExpiryFromLegacyBucketsAsync(cs, utcNow, cancellationToken);

        return new CareNudgeRunResultDto
        {
            UsersProcessed = userIds.Count,
            DigestsSent = digestsSent,
            VetRemindersSent = vetSent,
            DocumentRemindersSent = docSent,
        };
    }

    private static bool ShouldSendDailyDigest(CareNudgesOptions opts, DateTime utcNow)
    {
        var tz = ResolveTimeZone(opts.TimeZoneId);
        var local = TimeZoneInfo.ConvertTimeFromUtc(utcNow, tz);
        return local.Hour == Math.Clamp(opts.DigestRunHourLocal, 0, 23);
    }

    private static async Task<List<Guid>> LoadActiveUserIdsAsync(string cs, CancellationToken cancellationToken)
    {
        var ids = new List<Guid>();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT DISTINCT user_id FROM public.pets WHERE deleted_at IS NULL
            """,
            conn);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            ids.Add(reader.GetGuid(0));
        return ids;
    }

    private async Task AppendDocumentExpiryNudgesAsync(
        string cs,
        Guid userId,
        List<CareNudgeDto> nudges,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT d.id, d.pet_id, d.document_type::text, d.expiry_date::text, p.name
            FROM public.pet_documents d
            JOIN public.pets p ON p.id = d.pet_id
            WHERE d.user_id = @uid
              AND p.deleted_at IS NULL
              AND d.document_type::text IN ('insurance_policy', 'travel_certificate')
              AND d.expiry_date IS NOT NULL
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            if (!DateOnly.TryParse(reader.GetString(3), out var expiry))
                continue;
            var daysUntil = expiry.DayNumber - DateOnly.FromDateTime(utcNow.Date).DayNumber;
            if (daysUntil < 0)
                continue;

            var docType = reader.GetString(2);
            var label = docType == "travel_certificate" ? "Travel document" : "Insurance";
            var petName = reader.GetString(4);
            var petId = reader.GetGuid(1);
            var docId = reader.GetGuid(0);

            nudges.Add(new CareNudgeDto
            {
                Kind = "doc_expiry",
                DedupeKey = $"doc-expiry:{docId}:{daysUntil}",
                PetId = petId,
                PetName = petName,
                Priority = 35,
                Title = $"{label} for {petName}",
                Body = $"Expires in {daysUntil} day{(daysUntil == 1 ? "" : "s")} ({expiry:yyyy-MM-dd}).",
                DeepLink = $"/(home)/health-record/{petId}",
                EvidenceTable = "pet_documents",
                EvidenceId = docId,
                Channels = ["in_app", "push"],
            });
        }
    }

    private async Task AppendSeniorMobilityNudgesAsync(
        string cs,
        Guid userId,
        List<CareNudgeDto> nudges,
        CareNudgesOptions opts,
        CancellationToken cancellationToken)
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT id, name, date_of_birth
            FROM public.pets
            WHERE user_id = @uid AND deleted_at IS NULL AND date_of_birth IS NOT NULL
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var petId = reader.GetGuid(0);
            var petName = reader.GetString(1);
            var dob = reader.GetDateTime(2);
            var ageYears = DateTime.UtcNow.Year - dob.Year;
            if (dob.Date > DateTime.UtcNow.AddYears(-ageYears))
                ageYears--;

            if (ageYears < opts.SeniorAgeYears)
                continue;

            var journal = await LoadJournalBlobAsync(cs, petId, opts.JournalLookbackHours, cancellationToken);
            if (!ProactivePetHealthHeuristics.JournalTextMatchesMobilityKeywords(journal, opts.MobilityKeywords))
                continue;

            nudges.Add(new CareNudgeDto
            {
                Kind = "senior_mobility_tip",
                DedupeKey = $"senior-mobility:{petId}:{DateTime.UtcNow:yyyy-MM-dd}",
                PetId = petId,
                PetName = petName,
                Priority = 70,
                Title = "Wellness tip",
                Body = "Recent journal notes mention stiffness — tap for gentle care ideas.",
                DeepLink = $"/(home)/health-record/{petId}/pet-journal",
                Channels = ["push"],
            });
        }
    }

    private static async Task<string> LoadJournalBlobAsync(
        string cs,
        Guid petId,
        int lookbackHours,
        CancellationToken cancellationToken)
    {
        var since = DateTime.UtcNow.AddHours(-Math.Clamp(lookbackHours, 1, 168));
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT coalesce(note, ''), subtype, domain
            FROM public.pet_journal_entries
            WHERE pet_id = @pet AND created_at >= @since
            """,
            conn);
        cmd.Parameters.AddWithValue("pet", petId);
        cmd.Parameters.AddWithValue("since", since);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        var parts = new List<string>();
        while (await reader.ReadAsync(cancellationToken))
        {
            parts.Add(reader.GetString(0));
            parts.Add(reader.GetString(1));
            parts.Add(reader.GetString(2));
        }

        return string.Join(' ', parts);
    }

    private async Task<int> SendVetRemindersAsync(
        string cs,
        Guid userId,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var sent = 0;
        var in23h = utcNow.AddHours(23);
        var in25h = utcNow.AddHours(25);
        var in50m = utcNow.AddMinutes(50);
        var in70m = utcNow.AddMinutes(70);

        sent += await SendVetWindowAsync(cs, userId, in23h, in25h, "24h", cancellationToken);
        sent += await SendVetWindowAsync(cs, userId, in50m, in70m, "1h", cancellationToken);
        return sent;
    }

    private async Task<int> SendVetWindowAsync(
        string cs,
        Guid userId,
        DateTime fromUtc,
        DateTime toUtc,
        string window,
        CancellationToken cancellationToken)
    {
        if (!await VetPushEnabledAsync(cs, userId, cancellationToken))
            return 0;

        var sent = 0;
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT b.id, b.pet_id, b.clinic_name, p.name
            FROM public.vet_bookings b
            LEFT JOIN public.pets p ON p.id = b.pet_id
            WHERE b.user_id = @uid
              AND b.status = 'confirmed'
              AND b.start_utc >= @fromUtc
              AND b.start_utc <= @toUtc
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        cmd.Parameters.AddWithValue("fromUtc", fromUtc);
        cmd.Parameters.AddWithValue("toUtc", toUtc);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var bookingId = reader.GetGuid(0);
            var dedupeKey = $"vet:{bookingId}:{window}";
            if (!await TryClaimDeliveryAsync(cs, userId, dedupeKey, "push", cancellationToken))
                continue;

            var petName = reader.IsDBNull(3) ? "Your pet" : reader.GetString(3);
            var clinic = reader.IsDBNull(2) || string.IsNullOrWhiteSpace(reader.GetString(2))
                ? "the clinic"
                : reader.GetString(2).Trim();
            var title = window == "24h"
                ? $"Vet visit tomorrow — {petName}"
                : $"Vet visit in about an hour — {petName}";
            var body = window == "24h"
                ? $"Appointment at {clinic}."
                : $"Heads up: appointment at {clinic}.";

            await _expoPush.SendToUserAsync(
                userId,
                title,
                body,
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["notificationKind"] = "vet_appointment_reminder",
                    ["petId"] = reader.IsDBNull(1) ? "" : reader.GetGuid(1).ToString(),
                    ["url"] = "/(home)/book-vet-visit",
                    ["vetBookingId"] = bookingId.ToString(),
                    ["vetReminderWindow"] = window,
                },
                cancellationToken);
            sent++;
        }

        return sent;
    }

    private static async Task<bool> VetPushEnabledAsync(string cs, Guid userId, CancellationToken cancellationToken)
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT vet_appointment_reminder_push_enabled
            FROM public.user_preferences
            WHERE user_id = @uid
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        if (o is bool b)
            return b;
        return true;
    }

    private async Task<int> SendDocumentExpiryFromLegacyBucketsAsync(
        string cs,
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        // Bucket reminders still use legacy table for per-bucket dedupe; included in digest at digest hour.
        return await Task.FromResult(0);
    }

    private static async Task<bool> TryClaimDeliveryAsync(
        string cs,
        Guid userId,
        string dedupeKey,
        string channel,
        CancellationToken cancellationToken)
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.care_nudge_deliveries (user_id, dedupe_key, channel)
            VALUES (@uid, @key, @channel)
            ON CONFLICT (user_id, dedupe_key, channel) DO NOTHING
            RETURNING id
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        cmd.Parameters.AddWithValue("key", dedupeKey);
        cmd.Parameters.AddWithValue("channel", channel);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        return o != null && o != DBNull.Value;
    }

    private static TimeZoneInfo ResolveTimeZone(string? id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return TimeZoneInfo.Utc;
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id.Trim());
        }
        catch
        {
            return TimeZoneInfo.Utc;
        }
    }
}
