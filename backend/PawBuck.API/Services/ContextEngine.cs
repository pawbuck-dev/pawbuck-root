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
    public const int JournalInterviewMaxUserTurns = 8;

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

        return sb.ToString().TrimEnd();
    }

    /// <summary>
    /// Lines for Phase 3 (contextual scan): what is known from records vs UNKNOWN slots the model must fill via chips.
    /// </summary>
    public static void AppendJournalPhaseThreeContextualScan(
        StringBuilder sb,
        PetConversationalContextDto ctx,
        DateTime utcNow)
    {
        static bool InLastCalendarDays(DateTime eventDate, DateTime nowUtc, int days)
        {
            var delta = (nowUtc.Date - eventDate.Date).TotalDays;
            return delta >= 0 && delta <= days;
        }

        var meds = new List<string>();
        foreach (var e in ctx.RecentMedicalHistory.Where(x => x.Type == "medication_started"))
        {
            if (TryParseDate(e.Date, out var d) && InLastCalendarDays(d, utcNow, 14))
                meds.Add($"{e.Name} (started {e.Date})");
        }

        var vax5 = new List<string>();
        foreach (var e in ctx.RecentMedicalHistory.Where(x => x.Type == "vaccination"))
        {
            if (TryParseDate(e.Date, out var d) && InLastCalendarDays(d, utcNow, 5))
                vax5.Add($"{e.Name} ({e.Date})");
        }

        var exams7 = new List<string>();
        foreach (var e in ctx.RecentMedicalHistory.Where(x =>
                     x.Type.Equals("clinical_exam", StringComparison.OrdinalIgnoreCase)))
        {
            if (TryParseDate(e.Date, out var d) && InLastCalendarDays(d, utcNow, 7))
                exams7.Add($"{e.Name} ({e.Date})");
        }

        sb.AppendLine();
        sb.AppendLine("=== Phase 3 contextual scan (from records; UNKNOWN must be asked) ===");
        sb.Append("- Current medications (starts on record, last 14 days): ")
            .AppendLine(meds.Count > 0 ? string.Join("; ", meds) : "UNKNOWN");
        sb.Append("- Recent vaccines (last 5 days on record): ")
            .AppendLine(vax5.Count > 0 ? string.Join("; ", vax5) : "UNKNOWN");
        sb.Append("- Recent vet visit / exam (last 7 days on record): ")
            .AppendLine(exams7.Count > 0 ? string.Join("; ", exams7) : "UNKNOWN");
        sb.AppendLine("- Recent diet change (last 14 days): UNKNOWN (not in structured records — ask via chips if relevant)");
        sb.AppendLine("- Recent travel or boarding (last 7 days): UNKNOWN — ask via chips if relevant");
        sb.AppendLine("- Recent household change (last 14 days): UNKNOWN — ask via chips if relevant");
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

            **Interview goal:** In **5–8** short turns, run a **structured journal entry** interview with **five phases in order**:
            1) **Frame** — what they noticed and time course (one question per turn).
            2) **Symptom** — clarify the main concern (one question per turn).
            3) **Contextual scan** — you **must** run this phase **before** you consider the interview complete. Use the **Phase 3 contextual scan** block in the session context: use prefilled lines; for each line marked UNKNOWN, ask via **suggestedReplies** chips (multi-select style: offer several concrete options **plus** "Not sure" **plus** "+ Add details"). One **answer** question per turn that references those chips.
            4) **Red-flag screen** — you **must** run this phase **before** complete. Ask explicitly about emergency signs (toxins, seizure, collapse, severe bleeding, trouble breathing, bloated painful abdomen, unable to urinate, extreme pain, repeated vomiting with lethargy, etc.). **suggestedReplies** must include **Not sure** and **+ Add details** and clear yes/no style options.
               - If **any** red flag applies per the user's selections or text, set **answer** to exactly the token **{JournalEmergencyRedFlagToken}** (ASCII, no spaces), **status** to "CONTINUE", **summary** to "", **suggestedReplies** to [], **vetNotification** omitted. Do not write a journal summary and do not continue the interview in that same turn.
            5) **Confirm** — you **must not** set status to "COMPLETE" until the user has **explicitly confirmed** the draft entry (e.g. they tapped **Confirm** or clearly said yes). On the turn **before** COMPLETE: **status** "CONTINUE", **answer** shows a **plain-text draft** of what will be saved (parent register, short paragraphs, no markdown). **suggestedReplies** must include **Confirm**, **Edit**, **Not sure**, and **+ Add details**. After they confirm, return **COMPLETE** with the final **summary**.

            **Hard rules:**
            - **One question per turn** in **answer** while status is "CONTINUE" (except the draft recap turn may be a short paragraph recap plus one closing ask).
            - **Every** chip set (**suggestedReplies**) must include **Not sure** (or equivalent) and **+ Add details** (user may type detail on the next message).
            - **Never fabricate.** If something is unknown, omit that line from **summary** entirely — do **not** write "Not specified", "Unknown", or "N/A".
            - **summary** (when COMPLETE): **Parent-facing register only** — plain sentences, warm-neutral, like a short card the pet parent would read. **Forbidden on the card:** the words **patient**, **vomitus**, **anorexia**, **exhibiting**, or other stiff clinical jargon. Do **not** use markdown in **summary** or **answer**.
            - **vetNotification** (when COMPLETE, strongly encouraged): **Clinical / vet-export** wording is allowed here only (observations, triage, etc.). Keep **summary** and **answer** parent-safe.
            - **Fuzzy timing:** When you set observation timing in **vetNotification.observations**, use **onsetDate** as ISO **yyyy-MM-dd** when you can infer a day from the thread; set **onsetPrecision** to **approximate** when the user gave a range (e.g. "2–3 days ago"). Omit **onsetDate** if you cannot infer a day.
            - **Plain text:** **answer** and **summary** are plain text only (no markdown, no `**`).

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
