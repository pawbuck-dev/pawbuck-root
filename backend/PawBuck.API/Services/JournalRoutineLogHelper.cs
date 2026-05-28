using System.Text.RegularExpressions;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// One-turn meal / water journal logs (not symptom interviews).
/// </summary>
public static class JournalRoutineLogHelper
{
    public static bool IsRoutineJournalLog(string message)
    {
        if (string.IsNullOrWhiteSpace(message)) return false;
        return IsLogIntent(message) && (IsDietLog(message) || IsHydrationLog(message));
    }

    public static MiloChatResponse? TryBuildOneShotResponse(string message, string petName)
    {
        if (!IsRoutineJournalLog(message)) return null;

        var trimmed = message.Trim();
        var isHydration = IsHydrationLog(message) && !IsDietLog(message);
        var typeLabel = isHydration ? "Hydration" : "Diet";
        var kind = isHydration ? "water intake" : "meal";

        return new MiloChatResponse
        {
            Answer =
                $"Got it — I've noted {kind} for {petName}: “{Summarize(trimmed)}”. You can review it in the journal.",
            SuggestedReplies = Array.Empty<string>(),
            JournalSessionComplete = true,
            JournalStatus = "COMPLETE",
            JournalSummary = trimmed,
            UsedPetData = true,
            StructuredSummary = new JournalStructuredSummaryDto
            {
                Fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                {
                    ["TYPE"] = typeLabel,
                    ["NOTE"] = trimmed,
                },
            },
            HeuristicTags = ["routine_log", isHydration ? "hydration" : "diet"],
        };
    }

    private static string Summarize(string text, int maxLen = 120)
    {
        if (text.Length <= maxLen) return text;
        return text[..(maxLen - 1)] + "…";
    }

    private static bool IsLogIntent(string message)
    {
        var h = message.ToLowerInvariant();
        return Regex.IsMatch(h, @"\b(log|logged|logging|track|record)\b");
    }

    private static bool IsHydrationLog(string message)
    {
        var h = message.ToLowerInvariant();
        if (h.Contains("water") || h.Contains("drink") || h.Contains("hydrat")) return true;
        if (h.Contains("glass") && !h.Contains("food") && !h.Contains("meal")) return true;
        return false;
    }

    private static bool IsDietLog(string message)
    {
        var h = message.ToLowerInvariant();
        if (h.Contains("food") || h.Contains("meal") || h.Contains("bowl")) return true;
        if (Regex.IsMatch(h, @"\bblows?\b") && (h.Contains("food") || h.Contains("meal"))) return true;
        if (h.Contains("fed") || h.Contains("feeding") || h.Contains("kibble") || h.Contains("treat")) return true;
        if (h.Contains("appetite") && IsLogIntent(message)) return true;
        if (IsLogIntent(message) && Regex.IsMatch(h, @"\beat(ing)?\b")) return true;
        return false;
    }
}
