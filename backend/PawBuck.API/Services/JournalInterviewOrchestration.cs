using System.Text;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Turn budget, contextual-scan gaps, and chip templates for Milo journal interviews.
/// </summary>
public static class JournalInterviewOrchestration
{
    public const string ChipNotSure = "Not sure";
    public const string ChipAddDetails = "+ Add details";
    public const string ChipConfirm = "Confirm";
    public const string ChipEdit = "Edit";

    private static readonly string[] MedicationTemplateChips =
    [
        "No medications right now",
        "Yes — daily medication(s)",
        "Yes — as-needed medication",
        "Recently started or stopped a med",
        ChipNotSure,
        ChipAddDetails,
    ];

    private static readonly string[] VaccineTemplateChips =
    [
        "No recent vaccines",
        "Yes — within the last week",
        "Yes — more than a week ago",
        ChipNotSure,
        ChipAddDetails,
    ];

    private static readonly string[] RedFlagTemplateChips =
    [
        "No emergency signs",
        "Yes — possible emergency",
        ChipNotSure,
        ChipAddDetails,
    ];

    private static readonly string[] ConfirmTemplateChips =
    [
        ChipConfirm,
        ChipEdit,
        ChipNotSure,
        ChipAddDetails,
    ];

    public sealed class ContextScanState
    {
        public bool NeedsMedicationAsk { get; init; }
        public bool NeedsVaccineAsk { get; init; }
        public bool NeedsRecentVetVisitAsk { get; init; }
        public string? KnownMedicationsLine { get; init; }
        public string? KnownVaccinesLine { get; init; }
        public string? KnownVetVisitLine { get; init; }
    }

    public enum ChipTopic
    {
        Unknown,
        Medications,
        Vaccines,
        RedFlags,
        Confirm,
        General,
    }

    public static ContextScanState ComputeContextScanState(PetConversationalContextDto ctx, DateTime utcNow)
    {
        static bool InLastCalendarDays(DateTime eventDate, DateTime nowUtc, int days)
        {
            var delta = (nowUtc.Date - eventDate.Date).TotalDays;
            return delta >= 0 && delta <= days;
        }

        var medsRecent = new List<string>();
        foreach (var e in ctx.RecentMedicalHistory.Where(x => x.Type == "medication_started"))
        {
            if (ContextEngine.TryParseEventDate(e.Date, out var d) && InLastCalendarDays(d, utcNow, 14))
                medsRecent.Add($"{e.Name} (started {e.Date})");
        }

        var vaxRecent = new List<string>();
        foreach (var e in ctx.RecentMedicalHistory.Where(x => x.Type == "vaccination"))
        {
            if (ContextEngine.TryParseEventDate(e.Date, out var d) && InLastCalendarDays(d, utcNow, 14))
                vaxRecent.Add($"{e.Name} ({e.Date})");
        }

        var exams7 = new List<string>();
        foreach (var e in ctx.RecentMedicalHistory.Where(x =>
                     x.Type.Equals("clinical_exam", StringComparison.OrdinalIgnoreCase)))
        {
            if (ContextEngine.TryParseEventDate(e.Date, out var d) && InLastCalendarDays(d, utcNow, 7))
                exams7.Add($"{e.Name} ({e.Date})");
        }

        return new ContextScanState
        {
            NeedsMedicationAsk = ctx.MedicationsOnFileCount == 0,
            NeedsVaccineAsk = ctx.VaccinationsOnFileCount == 0,
            NeedsRecentVetVisitAsk = exams7.Count == 0,
            KnownMedicationsLine = medsRecent.Count > 0 ? string.Join("; ", medsRecent) : null,
            KnownVaccinesLine = vaxRecent.Count > 0 ? string.Join("; ", vaxRecent) : null,
            KnownVetVisitLine = exams7.Count > 0 ? string.Join("; ", exams7) : null,
        };
    }

    public static void AppendPhaseThreeContextualScan(
        StringBuilder sb,
        ContextScanState scan,
        string petName)
    {
        sb.AppendLine();
        sb.AppendLine("=== Phase 3 contextual scan (required record gaps only) ===");
        sb.AppendLine(
            "Ask at most ONE topic per turn. Medications and vaccines are NEVER combined in one question.");
        sb.AppendLine(
            "Do NOT ask about diet, travel, or household changes unless the user already mentioned appetite/GI, travel, or stress.");

        if (scan.NeedsMedicationAsk)
        {
            sb.AppendLine();
            sb.Append("- Medications on file: NONE — REQUIRED separate turn. Open with: ")
                .Append("I don't see any medicines on ")
                .Append(petName)
                .Append("'s record. Is ")
                .Append(petName)
                .AppendLine(" taking any medication right now?");
            sb.AppendLine("  Chips must be medication answers only (see medication chip template).");
        }
        else if (!string.IsNullOrWhiteSpace(scan.KnownMedicationsLine))
        {
            sb.Append("- Medications on file: ").AppendLine(scan.KnownMedicationsLine);
        }
        else
        {
            sb.AppendLine("- Medications on file: yes (see records) — do not re-ask unless user raises a new med concern.");
        }

        if (scan.NeedsVaccineAsk)
        {
            sb.AppendLine();
            sb.Append("- Vaccines on file: NONE — REQUIRED on its own turn (after medications if both missing). Open with: ")
                .Append("I don't see vaccines on ")
                .Append(petName)
                .Append("'s record. Has ")
                .Append(petName)
                .AppendLine(" had any vaccines recently?");
            sb.AppendLine("  Chips must be vaccine answers only (see vaccine chip template).");
        }
        else if (!string.IsNullOrWhiteSpace(scan.KnownVaccinesLine))
        {
            sb.Append("- Recent vaccines on record: ").AppendLine(scan.KnownVaccinesLine);
        }
        else
        {
            sb.AppendLine("- Vaccines on file: yes — do not re-ask unless user mentions shots/boosters.");
        }

        if (scan.NeedsRecentVetVisitAsk)
        {
            sb.AppendLine();
            sb.Append("- Recent vet visit (last 7 days): unknown — optional ONE turn only if still within budget; chips: No recent visit, Yes — checkup, Yes — sick visit, ")
                .Append(ChipNotSure)
                .Append(", ")
                .AppendLine(ChipAddDetails);
        }
        else if (!string.IsNullOrWhiteSpace(scan.KnownVetVisitLine))
        {
            sb.Append("- Recent vet visit (last 7 days): ").AppendLine(scan.KnownVetVisitLine);
        }
    }

    public static void AppendTurnDirective(
        StringBuilder sb,
        ContextScanState scan,
        IReadOnlyList<MiloChatHistoryMessage>? history,
        int userTurnNumber,
        string petName)
    {
        var askedMeds = HistoryAssistantAskedTopic(history, "medication", "medicine", "medicines on");
        var askedVax = HistoryAssistantAskedTopic(history, "vaccine", "vaccination", "shots", "booster");
        var askedRedFlag = HistoryAssistantAskedTopic(history, "emergency", "red flag", "trouble breathing", "seizure");
        var showedDraft = HistoryAssistantAskedTopic(history, "draft", "here's what i'll save", "ready to save", "log this");

        sb.AppendLine();
        sb.AppendLine("=== Turn directive (follow this now) ===");

        if (userTurnNumber <= 1)
        {
            sb.AppendLine("NEXT: Frame — what they noticed and when (one short question).");
            return;
        }

        if (userTurnNumber == 2)
        {
            sb.AppendLine("NEXT: Symptom detail — clarify the main concern (one short question).");
            return;
        }

        if (scan.NeedsMedicationAsk && !askedMeds)
        {
            sb.Append("NEXT: Medications ONLY — use the required opener from Phase 3. Do not ask about vaccines yet.");
            sb.AppendLine();
            return;
        }

        if (scan.NeedsVaccineAsk && !askedVax)
        {
            sb.Append("NEXT: Vaccines ONLY — separate turn from medications. Use the required opener from Phase 3.");
            sb.AppendLine();
            return;
        }

        if (!askedRedFlag && userTurnNumber < ContextEngine.JournalInterviewMaxUserTurns - 1)
        {
            sb.AppendLine("NEXT: Red-flag safety screen — one question about emergency signs, then move on.");
            return;
        }

        if (!showedDraft)
        {
            sb.AppendLine("NEXT: Confirm — show a plain-text draft of the journal entry; chips must include Confirm and Edit.");
            return;
        }

        sb.AppendLine("NEXT: If the user confirmed, return COMPLETE with summary. Otherwise offer Edit once, then complete.");
    }

    public static ChipTopic DetectChipTopic(string answer)
    {
        var a = (answer ?? "").ToLowerInvariant();
        if (a.Contains("confirm") && (a.Contains("draft") || a.Contains("save") || a.Contains("log")))
            return ChipTopic.Confirm;
        if (a.Contains("emergency") || a.Contains("red flag") || a.Contains("trouble breathing") || a.Contains("seizure"))
            return ChipTopic.RedFlags;
        if (a.Contains("vaccine") || a.Contains("vaccination") || a.Contains("booster") ||
            (a.Contains("shot") && !a.Contains("screenshot")))
            return ChipTopic.Vaccines;
        if (a.Contains("medication") || a.Contains("medicine") || a.Contains("medicines on"))
            return ChipTopic.Medications;
        return ChipTopic.General;
    }

    public static IReadOnlyList<string> SanitizeSuggestedReplies(string answer, IReadOnlyList<string>? rawChips)
    {
        var topic = DetectChipTopic(answer);
        var chips = (rawChips ?? Array.Empty<string>())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (topic is ChipTopic.Medications or ChipTopic.Vaccines or ChipTopic.RedFlags or ChipTopic.Confirm)
        {
            if (!ChipsMatchTopic(chips, topic))
                chips = topic switch
                {
                    ChipTopic.Medications => MedicationTemplateChips.ToList(),
                    ChipTopic.Vaccines => VaccineTemplateChips.ToList(),
                    ChipTopic.RedFlags => RedFlagTemplateChips.ToList(),
                    ChipTopic.Confirm => ConfirmTemplateChips.ToList(),
                    _ => chips,
                };
        }

        chips = EnsureRequiredChips(chips, topic);
        return chips.Take(6).ToList();
    }

    private static bool ChipsMatchTopic(IReadOnlyList<string> chips, ChipTopic topic)
    {
        if (chips.Count == 0)
            return false;

        var matches = 0;
        foreach (var chip in chips)
        {
            if (chip.Equals(ChipNotSure, StringComparison.OrdinalIgnoreCase) ||
                chip.Equals(ChipAddDetails, StringComparison.OrdinalIgnoreCase))
                continue;

            if (topic == ChipTopic.Medications && MedicationChipLooksRelevant(chip))
                matches++;
            else if (topic == ChipTopic.Vaccines && VaccineChipLooksRelevant(chip))
                matches++;
            else if (topic == ChipTopic.RedFlags && RedFlagChipLooksRelevant(chip))
                matches++;
            else if (topic == ChipTopic.Confirm &&
                     (chip.Equals(ChipConfirm, StringComparison.OrdinalIgnoreCase) ||
                      chip.Equals(ChipEdit, StringComparison.OrdinalIgnoreCase)))
                matches++;
        }

        return matches >= 2;
    }

    private static bool MedicationChipLooksRelevant(string chip)
    {
        var c = chip.ToLowerInvariant();
        return c.Contains("med") || c.Contains("none") || c.Contains("daily") || c.Contains("as-needed") ||
               c.Contains("stopped") || c.Contains("started");
    }

    private static bool VaccineChipLooksRelevant(string chip)
    {
        var c = chip.ToLowerInvariant();
        return c.Contains("vacc") || c.Contains("shot") || c.Contains("booster") || c.Contains("recent") ||
               c.Contains("week");
    }

    private static bool RedFlagChipLooksRelevant(string chip)
    {
        var c = chip.ToLowerInvariant();
        return c.Contains("emergency") || c.Contains("no ") || c.Contains("yes") || c.Contains("sign");
    }

    private static List<string> EnsureRequiredChips(List<string> chips, ChipTopic topic)
    {
        if (topic == ChipTopic.Confirm)
        {
            if (!chips.Any(c => c.Equals(ChipConfirm, StringComparison.OrdinalIgnoreCase)))
                chips.Insert(0, ChipConfirm);
            if (!chips.Any(c => c.Equals(ChipEdit, StringComparison.OrdinalIgnoreCase)))
                chips.Insert(1, ChipEdit);
        }

        if (!chips.Any(c => c.Equals(ChipNotSure, StringComparison.OrdinalIgnoreCase)))
            chips.Add(ChipNotSure);
        if (!chips.Any(c => c.Equals(ChipAddDetails, StringComparison.OrdinalIgnoreCase)))
            chips.Add(ChipAddDetails);

        return chips
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(6)
            .ToList();
    }

    private static bool HistoryAssistantAskedTopic(IReadOnlyList<MiloChatHistoryMessage>? history, params string[] keywords)
    {
        if (history == null)
            return false;

        foreach (var h in history)
        {
            if (!(h.Role ?? "").Equals("assistant", StringComparison.OrdinalIgnoreCase))
                continue;
            var blob = (h.Content ?? "").ToLowerInvariant();
            if (keywords.Any(k => blob.Contains(k, StringComparison.Ordinal)))
                return true;
        }

        return false;
    }
}
