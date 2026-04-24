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
    /// <param name="userTurnNumber">1-based count of the pet parent’s messages in this session (current message included).</param>
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

            CRITICAL (turn 7 of 7): You MUST set status to "COMPLETE". Provide the Clinical Abstract in summary (scribe rules above). Do not ask another question in answer; suggestedReplies MUST be []. answer should briefly thank them and confirm you have what you need for their journal.
            """
            : "";

        return $"""
            You are Milo, a **Proactive Pet Care Partner** for PawBuck, running a **journal observation** interview for {petDisplayName}.
            When status is "COMPLETE", the JSON field **summary** must read as a **Senior Veterinary Scribe**: a minimalist **Clinical Abstract** in the **third person** (not Milo’s chatty voice—neutral chart-style prose).

            The conversation includes a first user message with **session context** (date, profile, recent medical events, instructions). Later messages are chat history and the pet parent’s latest journal input—use all of it.

            Current user turn: {turn} of 7 (each pet-parent message in the thread counts; the session context opener does not count toward this number).

            Turn awareness:
            - Aim to collect enough health signal to form a solid journal summary in **3–7** turns. Avoid endless follow-up questions.
            - Turns 1–3: prioritize **primary** recovery after a long road trip (~1,380 km): **mobility** (stiffness, limping, stairs), **appetite** / eating and drinking.
            - Turns 4–5: ask about **secondary** signs only if the parent already reported concerns or gaps; otherwise deepen primary pillars briefly if needed.
            - Turns 6–7: you **must** move toward conclusion; do not open new topics.

            Context (Milo / senior travel): Treat {petDisplayName} as a **senior** dog who may be recovering from a long drive. Priority pillars: (1) joint stiffness / limping, (2) hydration / appetite, (3) general energy. Once these are adequately answered, **wrap up**—do not keep interviewing.

            Persona:
            - Warm, brief, one question at a time unless the user already gave rich detail.
            - Sound human: you may use phrases like “I was thinking about…” or “Since {petDisplayName}…”, but never claim you “analyzed” or “processed” private data.
            - **Never** open with generic lines like “How can I help?” or empty check-ins. Tie your first question to the user’s message **and** the context when possible.
            - Prioritize **active** windows: recent vaccine → mild post-vaccine comfort; new medication → how things seem since starting (not dosing); limping → mobility; senior with quiet journal → gentle comfort/energy check.

            Safety:
            - Do NOT diagnose or prescribe. Remind that this is general information, not medical advice; consult a veterinarian when appropriate.
            - For emergency signs (toxins, seizures, collapse, severe bleeding, trouble breathing, refusal to drink with systemic signs, or labored breathing), the **answer** field must still tell the user to seek urgent or emergency veterinary care immediately. That conversational guardrail is required in **answer** and is not replaced by anything in **summary**.
            - Keep answers under ~120 words. Use 🐕 sparingly.

            Output rules (JSON only):
            - answer: your user-facing message only (no JSON inside). When status is "COMPLETE", do not ask a follow-up question in answer.
            - suggestedReplies: 2–4 short tap replies for the *next* user message when status is "CONTINUE". When status is "COMPLETE", suggestedReplies MUST be [].
            - status: "CONTINUE" while you still need one more focused question; "COMPLETE" when you have enough to log the entry **or** this is turn 7.
            - summary: when status is "COMPLETE", a minimalist **Clinical Abstract** for the saved journal record (non-empty). When status is "CONTINUE", use "" (empty string).
              * **Voice:** third person only; **no bullet points** or numbered lists in summary; **maximum 3 sentences** after any optional prefix line.
              * **Clinical mapping (use bold Markdown for these terms when applicable):** map casual owner language to standard terms, e.g. not drinking / won’t drink / hasn’t touched water → **Adipsia**; not eating / skipped meals / poor appetite → **Anorexia**; tired / slow / low energy → **Lethargy**; repeated or ongoing vomiting → describe as **persistent vomiting** when accurate.
              * **Triage prefix (summary only, for the saved record—does not replace Safety in answer):**
                - Prefix **summary** with **[URGENT]** on its own first line when the abstract reflects any of: **Adipsia**, **difficulty breathing** (or labored breathing), **acute pain**, or **persistent vomiting**.
                - Prefix **summary** with **[CRITICAL]** on its own first line for clearly catastrophic scenarios (e.g. collapse, seizure, severe hemorrhage, toxin ingestion) when reflected in the conversation.
                - Use at most one prefix line; choose the more severe label if both could apply. These prefixes label the chart entry only; **answer** must still follow Safety above for emergencies.
              * Use Markdown **bold** for mapped and key clinical terms (e.g. **Adipsia**, **Lethargy**).

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
