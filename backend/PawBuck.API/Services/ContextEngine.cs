using System.Globalization;
using System.Linq;
using System.Text;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Heuristic guidance and proactive journal system prompt for Milo (journal mode).
/// </summary>
public static class ContextEngine
{
    /// <summary>Max user messages in a journal interview before the server forces completion.</summary>
    public const int JournalInterviewMaxUserTurns = 6;

    /// <summary>Model must return this exact string in <c>answer</c> when Phase 4 red-flag triggers emergency stop.</summary>
    public const string JournalEmergencyRedFlagToken = "EMERGENCY_RED_FLAG";

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
                    $"(priority) Recent vaccination ({v.Name}, {v.Date}) — assess mild post-vaccine comfort: injection-site soreness, sleepiness, or appetite change. Do not diagnose.");
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
                    $"(priority) New medication ({m.Name}, started {m.Date}) — assess tolerance since start (energy, appetite, GI tolerance). Do not change dosing.");
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
                    "(priority) Recent journal notes reference limping — assess mobility, stairs, and trajectory.");
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
                    $"(priority) Senior companion; no journal entries in the last {config.QuietJournalDays} days — assess energy, comfort, and stiffness.");
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

        AppendBehaviorBaseline(sb, ctx.BehaviorBaseline);

        return sb.ToString().TrimEnd();
    }

    /// <summary>
    /// Appends the owner's "normal for this pet" baseline so the model can contrast
    /// today's free-text entry (e.g. skipped meals, unusual vocalization) against
    /// stated norms. No-op when the owner has not completed the baseline yet.
    /// </summary>
    public static void AppendBehaviorBaseline(StringBuilder sb, BehaviorBaselineSnapshot? baseline)
    {
        if (baseline is null) return;

        sb.AppendLine();
        sb.AppendLine("Owner behavior baseline (normal for this pet):");
        sb.Append("- Energy: ").Append(baseline.EnergyLevel1To5).AppendLine("/5");
        if (!string.IsNullOrWhiteSpace(baseline.SocialDisposition))
            sb.Append("- Social: ").AppendLine(baseline.SocialDisposition);
        if (!string.IsNullOrWhiteSpace(baseline.FoodMotivation))
            sb.Append("- Food motivation: ").AppendLine(baseline.FoodMotivation);
        if (baseline.TypicalDeepSleepHours.HasValue
            || !string.IsNullOrWhiteSpace(baseline.SleepRestfulness)
            || !string.IsNullOrWhiteSpace(baseline.SleepSafeSpot))
        {
            sb.Append("- Sleep:");
            if (baseline.TypicalDeepSleepHours.HasValue)
                sb.Append(' ').Append(baseline.TypicalDeepSleepHours.Value.ToString("0.#",
                    System.Globalization.CultureInfo.InvariantCulture)).Append("h");
            if (!string.IsNullOrWhiteSpace(baseline.SleepRestfulness))
                sb.Append(' ').Append(baseline.SleepRestfulness);
            if (!string.IsNullOrWhiteSpace(baseline.SleepSafeSpot))
                sb.Append(" (safe spot: ").Append(baseline.SleepSafeSpot).Append(')');
            sb.AppendLine();
        }

        if (!string.IsNullOrWhiteSpace(baseline.VocalizationLevel))
            sb.Append("- Vocalization: ").AppendLine(baseline.VocalizationLevel);
        if (baseline.StressTriggers.Count > 0)
            sb.Append("- Top stress triggers: ").AppendLine(string.Join(", ", baseline.StressTriggers));
    }

    /// <summary>
    /// Lines for Phase 3 (contextual scan): record gaps the model must fill via dedicated turns.
    /// </summary>
    public static void AppendJournalPhaseThreeContextualScan(
        StringBuilder sb,
        PetConversationalContextDto ctx,
        DateTime utcNow,
        string petName)
    {
        var scan = JournalInterviewOrchestration.ComputeContextScanState(ctx, utcNow);
        JournalInterviewOrchestration.AppendPhaseThreeContextualScan(sb, scan, petName);
    }

    internal static bool TryParseEventDate(string s, out DateTime date) => TryParseDate(s, out date);

    /// <summary>
    /// Deprecated overload — prefer scan with pet name for required question openers.
    /// </summary>
    [Obsolete("Use overload with petName for contextual scan openers.")]
    public static void AppendJournalPhaseThreeContextualScan(
        StringBuilder sb,
        PetConversationalContextDto ctx,
        DateTime utcNow)
    {
        AppendJournalPhaseThreeContextualScan(sb, ctx, utcNow, ctx.PetProfile.Name);
    }

    /// <summary>
    /// System instruction for journal mode: persona and JSON rules only. The first user message in <c>contents</c> carries profile + medical context + date.
    /// </summary>
    /// <param name="userTurnNumber">1-based count of the user’s messages in this session (current message included).</param>
    public static string BuildJournalSystemPersonaPrompt(
        string petDisplayName,
        MiloJournalConfigSnapshot config,
        IReadOnlyList<string> heuristicHints,
        IReadOnlyList<string> heuristicTags,
        int userTurnNumber)
    {
        var hintsBlock = heuristicHints.Count > 0
            ? string.Join("\n", heuristicHints)
            : "(No priority hints — still use the context message in the thread to stay specific.)";

        var tagsLine = heuristicTags.Count > 0
            ? string.Join(", ", heuristicTags)
            : "none";

        var assistantLabel = string.Equals(petDisplayName.Trim(), "Milo", StringComparison.OrdinalIgnoreCase)
            ? "Milo AI (you may also say \"Milo\")"
            : "PawBuck's journal helper";

        var turn = Math.Clamp(userTurnNumber, 1, JournalInterviewMaxUserTurns);
        var hardStop = userTurnNumber >= JournalInterviewMaxUserTurns
            ? $"""

            CRITICAL (turn {JournalInterviewMaxUserTurns} of {JournalInterviewMaxUserTurns}): You MUST set status to "COMPLETE". Put the parent-facing journal card text in **summary** (rules below). Do not ask another question in **answer**; suggestedReplies MUST be []. **answer** should briefly thank them and confirm the entry is ready. If they have not explicitly confirmed on the prior turn, still complete with your best parent-facing summary from the thread.
            """
            : "";

        return $"""
            You are the **journal interview assistant** for {petDisplayName} on PawBuck. In user-facing prose, refer to yourself as **{assistantLabel}** only. Do **not** combine your name with {petDisplayName}'s name in one phrase.

            **Interview goal:** In **4–6** short turns total, run a **structured journal entry** interview:
            1) **Frame** (turn 1) — what they noticed and time course.
            2) **Symptom** (turn 2) — clarify the main concern.
            3) **Contextual scan** (turns 3–4 max) — follow the **Phase 3** and **Turn directive** blocks in session context:
               - If medications are missing on file, ask **medications only** on one turn (required opener in context). Never combine with vaccines.
               - If vaccines are missing on file, ask **vaccines only** on a **separate** turn.
               - Skip diet, travel, and household unless the user already mentioned appetite/GI, travel, or stress.
               - Chips must directly answer the question you asked (medication chips for med questions, vaccine chips for vaccine questions).
            4) **Red-flag screen** (one turn) — emergency signs. **suggestedReplies**: No emergency signs, Yes — possible emergency, Not sure, + Add details.
               - If **any** red flag applies, set **answer** to exactly **{JournalEmergencyRedFlagToken}**, **status** "CONTINUE", **summary** "", **suggestedReplies** [].
            5) **Confirm** (turn 5–6) — draft recap, then **COMPLETE** only after explicit Confirm.

            **Hard rules:**
            - **One question per turn** while status is "CONTINUE".
            - Follow the **Turn directive** block — do not repeat phases already covered in the thread.
            - **Do not** ask more than **two** contextual-scan questions (medications + vaccines when both missing; skip optional vet visit if turn budget is tight).
            - **Every** chip set must include **Not sure** and **+ Add details** unless using {JournalEmergencyRedFlagToken}.
            - **Never fabricate.** Omit unknown lines from **summary** — no "Not specified" or "N/A".
            - **summary** (COMPLETE): parent-facing plain sentences only — no markdown, no clinical jargon (**patient**, **vomitus**, **anorexia**, **exhibiting**).
            - **vetNotification** (COMPLETE, encouraged): clinical wording allowed here only.
            - **Plain text** in **answer** and **summary** only.

            The conversation includes a first user message with **session context**. Later messages are history and the latest user input.

            Current user turn: **{turn}** of **{JournalInterviewMaxUserTurns}** (each user message in the thread counts; the session context opener does not count).

            Safety (**answer** when not using the emergency token):
            - Do NOT diagnose or prescribe.
            - For mild concerns, avoid repetitive "see your vet" filler.
            - If the user describes an **immediate** crisis and you are **not** using {JournalEmergencyRedFlagToken}, still tell them to seek **emergency veterinary care now** in clear parent language.

            Output rules (**JSON only** to the API):
            - **answer**: plain text, user-facing.
            - **suggestedReplies**: when **CONTINUE**, up to **6** short chips; **always** include **Not sure** and **+ Add details** unless the turn uses {JournalEmergencyRedFlagToken}. When **COMPLETE**, [].
            - **status**: "CONTINUE" or "COMPLETE".
            - **summary**: when **COMPLETE**, non-empty parent-facing card text for the saved journal entry. When **CONTINUE**, "".
            - **vetNotification**: when **COMPLETE**, populate for vet-facing export (plain strings; clinical terms allowed). When **CONTINUE**, omit unless you are not using the red-flag token.

            Priority hints (internal; do not name as "hints" to the user):
            {hintsBlock}

            Internal tags (do not mention to user): {tagsLine}
            Prompt version: {config.PromptVersion}{hardStop}
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
