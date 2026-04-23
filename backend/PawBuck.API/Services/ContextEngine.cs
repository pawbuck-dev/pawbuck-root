using System.Globalization;
using System.Text;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Heuristic guidance and proactive journal system prompt for Milo (journal mode).
/// </summary>
public static class ContextEngine
{
    public const string TagPostVaccine = "post_vaccine";
    public const string TagNewMedication = "new_medication";
    public const string TagLimping = "limping";
    public const string TagSeniorQuiet = "senior_quiet";
    public const string TagUpcomingMilestone = "upcoming_milestone";

    /// <summary>
    /// Ordered hint lines and parallel heuristic tags for analytics/feedback.
    /// </summary>
    public static (IReadOnlyList<string> Hints, IReadOnlyList<string> Tags) EvaluateHeuristicGuidance(
        PetConversationalContextDto ctx,
        MiloJournalConfigSnapshot config,
        DateTime utcNow)
    {
        var hints = new List<string>();
        var tags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var v in ctx.RecentMedicalHistory.Where(x => x.Type == "vaccination"))
        {
            if (!TryParseDate(v.Date, out var d))
                continue;
            if ((utcNow.Date - d).TotalDays <= config.PostVaccineFocusDays && (utcNow.Date - d).TotalDays >= 0)
            {
                hints.Add(
                    $"(priority) Recent vaccination ({v.Name}, {v.Date}) — ask about mild post-vaccine comfort: soreness at the injection site, sleepiness, or appetite changes. Do not diagnose.");
                tags.Add(TagPostVaccine);
            }
        }

        foreach (var m in ctx.RecentMedicalHistory.Where(x => x.Type == "medication_started"))
        {
            if (!TryParseDate(m.Date, out var d))
                continue;
            if ((utcNow.Date - d).TotalDays <= config.NewMedicationFocusDays && (utcNow.Date - d).TotalDays >= 0)
            {
                hints.Add(
                    $"(priority) New medication ({m.Name}, started {m.Date}) — ask how things seem since starting (energy, appetite, tolerance). Do not change dosing.");
                tags.Add(TagNewMedication);
            }
        }

        var limpCutoff = utcNow.AddHours(-config.LimpingLookbackHours);
        foreach (var j in ctx.RecentJournalNotes)
        {
            if (!DateTime.TryParse(j.CreatedAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var created))
                continue;
            var createdUtc = created.Kind == DateTimeKind.Utc ? created : created.ToUniversalTime();
            if (createdUtc < limpCutoff)
                continue;
            var blob = $"{j.Subtype} {j.Note ?? ""}";
            if (blob.Contains("limp", StringComparison.OrdinalIgnoreCase) ||
                blob.Contains("limping", StringComparison.OrdinalIgnoreCase))
            {
                hints.Add(
                    "(priority) Recent journal mentions limping — ask about mobility, stairs, and whether it’s improving.");
                tags.Add(TagLimping);
                break;
            }
        }

        if (ctx.PetProfile.IsSenior)
        {
            var quietCutoff = utcNow.Date.AddDays(-config.QuietJournalDays);
            var anyRecent = ctx.RecentJournalNotes.Any(j =>
            {
                if (DateTime.TryParse(j.CreatedAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var c))
                {
                    var cu = c.Kind == DateTimeKind.Utc ? c : c.ToUniversalTime();
                    return cu.Date >= quietCutoff;
                }

                return false;
            });
            if (!anyRecent)
            {
                hints.Add(
                    $"(priority) {ctx.PetProfile.Name} is a senior — ask gently about overall energy, comfort, or stiffness since there’s been no journal note in the last {config.QuietJournalDays} days.");
                tags.Add(TagSeniorQuiet);
            }
        }

        foreach (var ms in ctx.UpcomingMilestones.Take(2))
        {
            hints.Add(
                $"(context) Upcoming: {ms.Type} — {ms.Label} around {ms.DueDate}. You may naturally weave this in without sounding alarming.");
            tags.Add(TagUpcomingMilestone);
        }

        return (hints, tags.OrderBy(x => x, StringComparer.Ordinal).ToList());
    }

    /// <summary>
    /// True if any <see cref="RecentMedicalEvent"/> has a parseable date within the last <paramref name="days"/> calendar days (UTC).
    /// </summary>
    public static bool HasMedicalEventWithinLastDays(PetConversationalContextDto ctx, int days, DateTime utcNow)
    {
        foreach (var e in ctx.RecentMedicalHistory)
        {
            if (!TryParseDate(e.Date, out var d))
                continue;
            var eventDate = d.Date;
            var deltaDays = (utcNow.Date - eventDate).TotalDays;
            if (deltaDays >= 0 && deltaDays <= days)
                return true;
        }

        return false;
    }

    public static string FormatContextForPrompt(PetConversationalContextDto ctx)
    {
        var sb = new StringBuilder();
        sb.AppendLine("=== CONVERSATIONAL CONTEXT (authorized records) ===");
        sb.AppendLine();
        sb.AppendLine("Pet profile:");
        sb.Append("- ").Append(ctx.PetProfile.Name).Append(", ").Append(ctx.PetProfile.Species)
            .Append(", ").Append(ctx.PetProfile.Breed).Append(", ").Append(ctx.PetProfile.AgeDisplay)
            .Append(ctx.PetProfile.IsSenior ? ", senior" : "").AppendLine();

        if (ctx.RecentMedicalHistory.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Recent medical events (window):");
            foreach (var e in ctx.RecentMedicalHistory)
                sb.Append("- ").Append(e.Type).Append(": ").Append(e.Name).Append(" (").Append(e.Date).Append(')').AppendLine();
        }

        if (ctx.RecentJournalNotes.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Recent journal notes:");
            foreach (var j in ctx.RecentJournalNotes)
            {
                sb.Append("- ").Append(j.EntryDate).Append(" [").Append(j.Domain).Append('/').Append(j.Subtype).Append("] ");
                sb.AppendLine((j.Note ?? "").Length > 200 ? (j.Note ?? "")[..200] + "…" : (j.Note ?? ""));
            }
        }

        if (ctx.UpcomingMilestones.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Upcoming milestones:");
            foreach (var m in ctx.UpcomingMilestones)
                sb.Append("- ").Append(m.Type).Append(": ").Append(m.Label).Append(" — ").AppendLine(m.DueDate);
        }

        return sb.ToString().TrimEnd();
    }

    /// <summary>
    /// System instruction for journal mode: persona and JSON rules only. The first user message in <c>contents</c> carries profile + medical context + date.
    /// </summary>
    public static string BuildJournalSystemPersonaPrompt(
        string petDisplayName,
        MiloJournalConfigSnapshot config,
        IReadOnlyList<string> heuristicHints,
        IReadOnlyList<string> heuristicTags)
    {
        var hintsBlock = heuristicHints.Count > 0
            ? string.Join("\n", heuristicHints)
            : "(No priority hints — still use the context message in the thread to stay specific.)";

        var tagsLine = heuristicTags.Count > 0
            ? string.Join(", ", heuristicTags)
            : "none";

        return $"""
            You are Milo, a **Proactive Pet Care Partner** for PawBuck, running a **journal observation** interview for {petDisplayName}.

            The conversation includes a first user message with **session context** (date, profile, recent medical events, instructions). Later messages are chat history and the pet parent’s latest journal input—use all of it.

            Persona:
            - Warm, brief, one question at a time unless the user already gave rich detail.
            - Sound human: you may use phrases like “I was thinking about…” or “Since {petDisplayName}…”, but never claim you “analyzed” or “processed” private data.
            - **Never** open with generic lines like “How can I help?” or empty check-ins. Tie your first question to the user’s message **and** the context when possible.
            - Prioritize **active** windows: recent vaccine → mild post-vaccine comfort; new medication → how things seem since starting (not dosing); limping → mobility; senior with quiet journal → gentle comfort/energy check.

            Safety:
            - Do NOT diagnose or prescribe. Remind that this is general information, not medical advice; consult a veterinarian when appropriate.
            - For emergency signs (toxins, seizures, collapse, severe bleeding, trouble breathing), tell the user to seek urgent veterinary care immediately.
            - Keep answers under ~120 words. Use 🐕 sparingly.

            Output rules (JSON only):
            - answer: your user-facing message only (no JSON inside).
            - suggestedReplies: 2–4 short tap replies for the *next* user message. If journalSessionComplete is true, suggestedReplies MUST be [].
            - journalSessionComplete: true when you have enough to log a meaningful entry (typically after 2–4 turns). When true, answer should confirm logging and monitoring.

            Priority hints (use these first when they fit the conversation):
            {hintsBlock}

            Internal tags (do not mention to user): {tagsLine}
            Prompt version: {config.PromptVersion}
            """;
    }

    private static bool TryParseDate(string s, out DateTime date)
    {
        date = default;
        if (string.IsNullOrWhiteSpace(s))
            return false;
        return DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out date);
    }
}
