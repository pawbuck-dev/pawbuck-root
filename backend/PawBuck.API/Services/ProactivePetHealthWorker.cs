using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Configuration;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Daily senior journal heuristic + Gemini tip + Expo push.</summary>
public sealed class ProactivePetHealthWorker : BackgroundService
{
    private readonly IOptionsMonitor<ProactivePetHealthOptions> _options;
    private readonly IOptions<GeminiOptions> _geminiOptions;
    private readonly IOptions<SupabaseOptions> _supabaseOptions;
    private readonly IGeminiGenerateContentService _geminiGenerate;
    private readonly IExpoPushService _expoPush;
    private readonly ILogger<ProactivePetHealthWorker> _logger;

    public ProactivePetHealthWorker(
        IOptionsMonitor<ProactivePetHealthOptions> options,
        IOptions<GeminiOptions> geminiOptions,
        IOptions<SupabaseOptions> supabaseOptions,
        IGeminiGenerateContentService geminiGenerate,
        IExpoPushService expoPush,
        ILogger<ProactivePetHealthWorker> logger)
    {
        _options = options;
        _geminiOptions = geminiOptions;
        _supabaseOptions = supabaseOptions;
        _geminiGenerate = geminiGenerate;
        _expoPush = expoPush;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var opts = _options.CurrentValue;
            if (!opts.Enabled)
            {
                await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
                continue;
            }

            var tz = ResolveTimeZone(opts.TimeZoneId);
            var delay = DelayUntilNextLocalRun(tz, opts.RunHourLocal, DateTime.UtcNow);
            _logger.LogDebug("ProactivePetHealthWorker sleeping {Delay} until next run", delay);
            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }

            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ProactivePetHealthWorker run failed");
            }
        }
    }

    private async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        var opts = _options.CurrentValue;
        var cs = _supabaseOptions.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return;

        var apiKey = _geminiOptions.Value.ApiKey?.Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            apiKey = Environment.GetEnvironmentVariable("GOOGLE_GEMINI_API_KEY")?.Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("ProactivePetHealthWorker: Gemini API key missing; skipping run");
            return;
        }

        var model = string.IsNullOrWhiteSpace(_geminiOptions.Value.Model)
            ? GeminiOptions.DefaultModelId
            : _geminiOptions.Value.Model.Trim();

        var since = DateTime.UtcNow.AddHours(-Math.Clamp(opts.JournalLookbackHours, 1, 168));
        var keywords = opts.MobilityKeywords ?? Array.Empty<string>();

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        var pets = new List<(Guid Id, Guid UserId, string Name, DateTime Dob)>();
        await using (var cmd = new NpgsqlCommand(
                   """
                   SELECT id, user_id, name, date_of_birth
                   FROM public.pets
                   WHERE deleted_at IS NULL
                     AND date_of_birth IS NOT NULL
                   """,
                   conn))
        {
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var dob = reader.GetDateTime(3);
                pets.Add((reader.GetGuid(0), reader.GetGuid(1), reader.GetString(2), dob));
            }
        }

        foreach (var pet in pets)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var ageYears = AgeYears(pet.Dob, DateTime.UtcNow.Date);
            if (ageYears < opts.SeniorAgeYears)
                continue;

            var journalBlob = await LoadJournalBlobAsync(conn, pet.Id, since, cancellationToken);
            if (!ProactivePetHealthHeuristics.JournalTextMatchesMobilityKeywords(journalBlob, keywords))
                continue;

            var claimed = await TryClaimSendSlotAsync(conn, pet.Id, cancellationToken);
            if (!claimed)
                continue;

            try
            {
                var tip = await GenerateTipAsync(apiKey, model, pet.Name, journalBlob, cancellationToken);
                if (string.IsNullOrWhiteSpace(tip))
                {
                    await ReleaseSendSlotAsync(conn, pet.Id, cancellationToken);
                    continue;
                }

                var title = opts.NotificationTitle;
                var data = new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["type"] = "senior_mobility_tip",
                    ["petId"] = pet.Id.ToString(),
                };
                await _expoPush.SendToUserAsync(pet.UserId, title, tip.Trim(), data, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ProactivePetHealthWorker: failed for pet {PetId}", pet.Id);
                await ReleaseSendSlotAsync(conn, pet.Id, cancellationToken);
            }
        }
    }

    private static async Task<string> LoadJournalBlobAsync(
        NpgsqlConnection conn,
        Guid petId,
        DateTime sinceUtc,
        CancellationToken cancellationToken)
    {
        var sb = new StringBuilder();
        await using var cmd = new NpgsqlCommand(
            """
            SELECT coalesce(note, ''), subtype, domain
            FROM public.pet_journal_entries
            WHERE pet_id = @pet
              AND created_at >= @since
            """,
            conn);
        cmd.Parameters.AddWithValue("pet", petId);
        cmd.Parameters.AddWithValue("since", sinceUtc);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            sb.Append(reader.GetString(0)).Append(' ');
            sb.Append(reader.GetString(1)).Append(' ');
            sb.Append(reader.GetString(2)).Append(' ');
        }

        return sb.ToString();
    }

    private static async Task<bool> TryClaimSendSlotAsync(NpgsqlConnection conn, Guid petId, CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.proactive_pet_health_sends (pet_id, sent_on)
            VALUES (@pet_id, (timezone('utc', now()))::date)
            ON CONFLICT (pet_id, sent_on) DO NOTHING
            RETURNING pet_id
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        return o != null && o != DBNull.Value;
    }

    private static async Task ReleaseSendSlotAsync(NpgsqlConnection conn, Guid petId, CancellationToken cancellationToken)
    {
        await using var cmd = new NpgsqlCommand(
            """
            DELETE FROM public.proactive_pet_health_sends
            WHERE pet_id = @pet_id
              AND sent_on = (timezone('utc', now()))::date
            """,
            conn);
        cmd.Parameters.AddWithValue("pet_id", petId);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task<string?> GenerateTipAsync(
        string apiKey,
        string model,
        string petName,
        string journalContext,
        CancellationToken cancellationToken)
    {
        var prompt = $"""
            You are Milo, PawBuck's caring pet wellness assistant. The pet parent journal (recent) mentions stiffness or being slow for senior pet "{petName}".
            Write ONE short sentence (max 140 characters) with a gentle, non-alarming wellness tip (e.g. shorter walk, softer surfaces). No diagnosis or medication advice. No emojis unless one at the end.

            Journal context (may be truncated):
            {(journalContext.Trim().Length > 800 ? journalContext.Trim()[..800] : journalContext.Trim())}
            """;

        var requestBody = new
        {
            contents = new[]
            {
                new { role = "user", parts = new[] { new { text = prompt } } },
            },
            generationConfig = new { temperature = 0.5, maxOutputTokens = 120 },
        };

        var result = await _geminiGenerate.GenerateContentAsync(
            GeminiCallKind.ProactiveTip,
            model,
            requestBody,
            apiKey,
            cancellationToken);
        if (!result.Success)
        {
            _logger.LogWarning("Gemini proactive tip HTTP {Status}", (int)result.StatusCode);
            return null;
        }

        return GeminiResponseParser.TryExtractCandidateText(result.ResponseJson, out var text) && !string.IsNullOrWhiteSpace(text)
            ? text!.Trim()
            : null;
    }

    private static bool TryExtractGeminiCandidateText(string json, out string? text)
    {
        text = null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                return false;
            var candidate = candidates[0];
            if (!candidate.TryGetProperty("content", out var contentEl))
                return false;
            if (!contentEl.TryGetProperty("parts", out var parts) || parts.GetArrayLength() == 0)
                return false;
            if (!parts[0].TryGetProperty("text", out var textEl))
                return false;
            text = textEl.GetString();
            return !string.IsNullOrWhiteSpace(text);
        }
        catch
        {
            return false;
        }
    }

    private static double AgeYears(DateTime dateOfBirth, DateTime todayUtc)
    {
        var years = todayUtc.Year - dateOfBirth.Year;
        if (todayUtc.DayOfYear < dateOfBirth.DayOfYear)
            years--;
        return years < 0 ? 0 : years;
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

    private static TimeSpan DelayUntilNextLocalRun(TimeZoneInfo tz, int hourLocal, DateTime utcNow)
    {
        hourLocal = Math.Clamp(hourLocal, 0, 23);
        var local = TimeZoneInfo.ConvertTimeFromUtc(utcNow, tz);
        var next = new DateTime(local.Year, local.Month, local.Day, hourLocal, 0, 0, DateTimeKind.Unspecified);
        if (local >= next)
            next = next.AddDays(1);
        var nextUtc = TimeZoneInfo.ConvertTimeToUtc(next, tz);
        var delay = nextUtc - utcNow;
        return delay < TimeSpan.FromSeconds(5) ? TimeSpan.FromSeconds(5) : delay;
    }
}
