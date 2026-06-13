using System.Globalization;
using System.Text.RegularExpressions;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Journal check-in topic picker and one-shot "All good today" recovery logs when prior issues exist.
/// </summary>
public static class JournalWellnessCheckInHelper
{
    public const string AllGoodTodayChip = "All good today";
    public const int DefaultLookbackDays = 14;

    public static IReadOnlyList<string> SymptomTopicChipsForSelection { get; } =
    [
        "Vomiting or diarrhea",
        "Lethargic today",
        "Changed appetite",
        "Scratching a lot",
        "Limping",
        "Coughing",
        "Eye or ear issue",
    ];

    private static readonly string[] SymptomTopicChips = SymptomTopicChipsForSelection.ToArray();

    private static readonly string[] WellnessRecoveryPhrases =
    [
        "all good today",
        "back to normal",
        "doing well",
        "feeling better",
        "resolved",
        "no issues",
        "symptom free",
        "symptoms resolved",
    ];

    private static readonly string[] SymptomKeywords =
    [
        "vomit",
        "diarr",
        "letharg",
        "limp",
        "cough",
        "itch",
        "scratch",
        "appetite",
        "off food",
        "not eating",
        "eye",
        "ear",
        "pain",
        "blood",
        "symptom",
        "tired",
        "energy",
    ];

    public static bool IsAllGoodTodaySelection(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return false;
        if (string.Equals(message.Trim(), AllGoodTodayChip, StringComparison.OrdinalIgnoreCase))
            return true;
        return Regex.IsMatch(message, @"\ball good today\b", RegexOptions.IgnoreCase);
    }

    public static bool IsWellnessRecoveryNote(RecentJournalNote note)
    {
        var blob = NoteBlob(note);
        return WellnessRecoveryPhrases.Any(p => blob.Contains(p, StringComparison.OrdinalIgnoreCase));
    }

    public static bool IsIssueNote(RecentJournalNote note)
    {
        if (IsWellnessRecoveryNote(note))
            return false;

        if (string.Equals(note.Subtype, "symptom", StringComparison.OrdinalIgnoreCase))
            return true;

        var blob = NoteBlob(note);
        if (SymptomKeywords.Any(k => blob.Contains(k, StringComparison.OrdinalIgnoreCase)))
            return true;

        if (string.Equals(note.Subtype, "diet", StringComparison.OrdinalIgnoreCase)
            && Regex.IsMatch(blob, @"\b(log|logged|meal|bowl|food)\b", RegexOptions.IgnoreCase)
            && !SymptomKeywords.Any(k => blob.Contains(k, StringComparison.OrdinalIgnoreCase)))
            return false;

        return false;
    }

    public static IReadOnlyList<RecentJournalNote> GetRecentIssueNotes(
        IEnumerable<RecentJournalNote> notes,
        DateTime utcNow,
        int lookbackDays = DefaultLookbackDays)
    {
        var today = utcNow.Date;
        var cutoff = today.AddDays(-lookbackDays);
        return notes
            .Where(n => TryParseEntryDate(n, out var entryDate) && entryDate < today && entryDate >= cutoff)
            .Where(IsIssueNote)
            .OrderByDescending(n => ParseEntryDate(n))
            .ToList();
    }

    public static bool ShouldOfferAllGoodToday(PetConversationalContextDto? ctx, DateTime utcNow) =>
        ctx != null && GetRecentIssueNotes(ctx.RecentJournalNotes, utcNow).Count > 0;

    public static IReadOnlyList<string> BuildTopicPickerChips(PetConversationalContextDto? ctx, DateTime utcNow)
    {
        var chips = new List<string>();
        if (ShouldOfferAllGoodToday(ctx, utcNow))
            chips.Add(AllGoodTodayChip);
        chips.AddRange(SymptomTopicChips);
        chips.Add("Not sure");
        return chips;
    }

    public static MiloChatResponse BuildTopicPickerResponse(
        string petDisplayName,
        string? promptVersion,
        PetConversationalContextDto? ctx,
        DateTime utcNow)
    {
        var name = string.IsNullOrWhiteSpace(petDisplayName) ? "your pet" : petDisplayName.Trim();
        var issues = ctx != null ? GetRecentIssueNotes(ctx.RecentJournalNotes, utcNow) : Array.Empty<RecentJournalNote>();
        var chips = BuildTopicPickerChips(ctx, utcNow);

        var answer = issues.Count > 0
            ? $"What would you like to note about {name} today? You logged {DescribeConcern(issues[0])} recently — is {name} all good today, or is something else going on?"
            : $"What would you like to note about {name} today? Pick a topic or describe it in your own words.";

        return new MiloChatResponse
        {
            Answer = answer,
            SuggestedReplies = chips,
            JournalStatus = "CONTINUE",
            PromptVersion = promptVersion,
            UsedPetData = issues.Count > 0,
        };
    }

    public static MiloChatResponse? TryBuildAllGoodTodayResponse(
        string message,
        PetConversationalContextDto ctx,
        string petName,
        DateTime utcNow)
    {
        if (!IsAllGoodTodaySelection(message))
            return null;

        var issues = GetRecentIssueNotes(ctx.RecentJournalNotes, utcNow);
        if (issues.Count == 0)
        {
            return new MiloChatResponse
            {
                Answer =
                    $"Got it — I've noted that {petName} is doing well today. You can review it in the journal.",
                SuggestedReplies = Array.Empty<string>(),
                JournalSessionComplete = true,
                JournalStatus = "COMPLETE",
                JournalSummary = $"{petName} is doing well today.",
                UsedPetData = true,
                StructuredSummary = new JournalStructuredSummaryDto
                {
                    Fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                    {
                        ["STATUS"] = "Well",
                        ["NOTE"] = "Doing well today.",
                    },
                },
                HeuristicTags = ["wellness_checkin"],
            };
        }

        var trackedDays = ComputeTrackedDays(issues, utcNow);
        var priorConcern = DescribeConcern(issues[0]);
        var firstIssueDate = issues.MinBy(ParseEntryDate)!;
        var firstWhen = FormatRelativeIssueDay(ParseEntryDate(firstIssueDate), utcNow);
        var summary =
            $"{petName} is back to normal today. Prior concern: {priorConcern} (first noted {firstWhen}). Issue tracked for {trackedDays} day{(trackedDays == 1 ? "" : "s")}.";

        return new MiloChatResponse
        {
            Answer =
                $"Great to hear {petName} is doing well today. I've saved a recovery note that links back to the recent {priorConcern.ToLowerInvariant()} concern.",
            SuggestedReplies = Array.Empty<string>(),
            JournalSessionComplete = true,
            JournalStatus = "COMPLETE",
            JournalSummary = summary,
            UsedPetData = true,
            StructuredSummary = new JournalStructuredSummaryDto
            {
                Fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    ["STATUS"] = "Resolved",
                    ["PRIOR_CONCERN"] = priorConcern,
                    ["TRACKED_DAYS"] = trackedDays.ToString(CultureInfo.InvariantCulture),
                    ["FIRST_NOTED"] = ParseEntryDate(firstIssueDate).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    ["NOTE"] = summary,
                },
            },
            HeuristicTags = ["wellness_checkin", "issue_resolution"],
        };
    }

    internal static int ComputeTrackedDays(IReadOnlyList<RecentJournalNote> issues, DateTime utcNow)
    {
        if (issues.Count == 0)
            return 0;
        var first = issues.Min(n => ParseEntryDate(n).Date);
        var days = (utcNow.Date - first).Days + 1;
        return Math.Max(1, days);
    }

    internal static string DescribeConcern(RecentJournalNote note)
    {
        var blob = NoteBlob(note);
        if (blob.Contains("vomit", StringComparison.OrdinalIgnoreCase)
            || blob.Contains("diarr", StringComparison.OrdinalIgnoreCase))
            return "vomiting or diarrhea";
        if (blob.Contains("letharg", StringComparison.OrdinalIgnoreCase) || blob.Contains("tired", StringComparison.OrdinalIgnoreCase))
            return "low energy";
        if (blob.Contains("appetite", StringComparison.OrdinalIgnoreCase) || blob.Contains("off food", StringComparison.OrdinalIgnoreCase))
            return "appetite change";
        if (blob.Contains("scratch", StringComparison.OrdinalIgnoreCase) || blob.Contains("itch", StringComparison.OrdinalIgnoreCase))
            return "itching";
        if (blob.Contains("limp", StringComparison.OrdinalIgnoreCase))
            return "limping";
        if (blob.Contains("cough", StringComparison.OrdinalIgnoreCase))
            return "coughing";
        if (blob.Contains("eye", StringComparison.OrdinalIgnoreCase) || blob.Contains("ear", StringComparison.OrdinalIgnoreCase))
            return "eye or ear issue";

        if (string.Equals(note.Subtype, "symptom", StringComparison.OrdinalIgnoreCase))
        {
            var trimmed = (note.Note ?? "").Trim();
            if (trimmed.Length > 0)
                return trimmed.Length <= 48 ? trimmed : trimmed[..45] + "…";
            return "a symptom";
        }

        return "a health concern";
    }

    private static string NoteBlob(RecentJournalNote note) =>
        $"{note.Subtype} {note.Note ?? ""}";

    private static bool TryParseEntryDate(RecentJournalNote note, out DateTime date)
    {
        date = default;
        if (DateTime.TryParse(note.EntryDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out date))
            return true;
        if (DateTime.TryParse(note.CreatedAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var created))
        {
            date = created.Kind == DateTimeKind.Utc ? created.Date : created.ToUniversalTime().Date;
            return true;
        }

        return false;
    }

    private static DateTime ParseEntryDate(RecentJournalNote note)
    {
        TryParseEntryDate(note, out var date);
        return date;
    }

    private static string FormatRelativeIssueDay(DateTime issueDate, DateTime utcNow)
    {
        var delta = (utcNow.Date - issueDate.Date).Days;
        return delta switch
        {
            1 => "yesterday",
            > 1 and < 7 => $"{delta} days ago",
            >= 7 and < 14 => "last week",
            _ => issueDate.ToString("MMM d", CultureInfo.InvariantCulture),
        };
    }
}
