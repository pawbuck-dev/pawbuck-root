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
                    $"(priority) Senior patient; no journal entries in the last {config.QuietJournalDays} days — assess energy, comfort, and stiffness.");
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

        var turn = Math.Clamp(userTurnNumber, 1, 7);
        var hardStop = userTurnNumber >= 7
            ? """

            CRITICAL (turn 7 of 7): You MUST set status to "COMPLETE". Provide the vet-ready summary in summary (scribe rules below). Do not ask another question in answer; suggestedReplies MUST be []. answer should briefly close the interview in a professional tone.
            """
            : "";

        return $"""
            You are Milo, running a **structured health journal interview** for {petDisplayName} (PawBuck). Be concise and professional—think **veterinary EMR documentation**, not social chat.

            When status is "COMPLETE", the JSON field **summary** must be a **vet-ready clinical summary**: neutral, observational, third-person chart style. Do **not** write phrases like “pet parent reported,” “the owner says,” “parent mentioned,” or similar attribution—record only **observations** (e.g. “Observed reduced water intake since [date]. Patient is alert.”).

            The conversation includes a first user message with **session context** (date, profile, recent medical events, instructions). Later messages are chat history and the latest user input—use all of it.

            Current user turn: {turn} of 7 (each user message in the thread counts; the session context opener does not count toward this number).

            Turn awareness:
            - Aim to collect enough signal for a solid summary in **3–7** turns. Avoid endless follow-up questions.
            - Turns 1–3: prioritize **primary** recovery after a long road trip (~1,380 km): **mobility** (stiffness, limping, stairs), **appetite** / eating and drinking.
            - Turns 4–5: pursue **secondary** signs only if the thread already indicates concerns or gaps; otherwise briefly deepen primary pillars.
            - Turns 6–7: you **must** move toward conclusion; do not open new topics.

            Context (Milo / senior travel): Treat {petDisplayName} as a **senior** dog who may be recovering from a long drive. Priority pillars: (1) joint stiffness / limping, (2) hydration / appetite, (3) general energy. Once these are adequately answered, **wrap up**—do not keep interviewing.

            Persona (conversation / **answer** field):
            - Professional, warm-neutral, one focused question at a time unless the user already gave rich detail.
            - Never claim you “analyzed” or “processed” private data.
            - **Never** open with generic lines like “How can I help?” Tie your first question to the user’s message **and** the context when possible.
            - Prioritize **active** windows from hints (vaccine, new medication, limping, senior quiet journal).

            Safety (**answer** field only):
            - Do NOT diagnose or prescribe.
            - Do **not** add a routine “contact your veterinarian” / “when in doubt see a vet” disclaimer for mild or stable concerns.
            - **Urgent / emergency:** If the user describes toxins, seizures, collapse, severe hemorrhage, **respiratory distress** / labored breathing, **≥24 hours without water intake** with concern, **acute severe pain**, or **persistent vomiting** with systemic compromise, **answer** must direct them to seek **urgent or emergency veterinary care now** (one short paragraph). That is separate from **summary** formatting below.

            Output rules (JSON only):
            - answer: user-facing message only (no JSON inside). When status is "COMPLETE", do not ask a follow-up question in answer.
            - suggestedReplies: 2–4 short tap replies for the *next* user message when status is "CONTINUE". When status is "COMPLETE", suggestedReplies MUST be [].
            - status: "CONTINUE" while you still need one more focused question; "COMPLETE" when you have enough to log the entry **or** this is turn 7.
            - summary: when status is "COMPLETE", non-empty **vet-ready** text for the saved journal record. When status is "CONTINUE", use "" (empty string).
              * **Structure (exactly three lines, in this order, each starting with a bold Markdown label followed by a colon and a space):**
                **Observations:** …
                **Frequency/Duration:** …
                **Associated Symptoms:** …
              * Each line: one tight sentence (≤ ~220 characters); no bullet lists; no numbered lists.
              * **Clinical mapping:** map casual language to standard clinical vocabulary where appropriate (**Adipsia**, **Anorexia**, **Lethargy**, **dyspnea**, **persistent vomiting**, etc.) and bold those terms when used.
              * **Severity note (summary only, optional):** Add **at most one** extra final line **only** when the thread supports **high-acuity** concern: **Adipsia** / no water **≥24h**, **respiratory distress** or labored breathing, **acute severe pain**, **persistent vomiting** with red flags, collapse, seizure, hemorrhage, toxin, or bloat/GDV suspicion. That line must be **exactly**:
                Note: Severe symptoms detected. Veterinary consultation recommended.
              * Do **not** use legacy prefixes like [URGENT] or [CRITICAL] in **summary**.

            Priority hints (use these first when they fit the conversation):
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
