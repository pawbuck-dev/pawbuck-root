using System.Text.Json;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Deterministic red-flag evaluation for journal tree answers (Phase 2 eval + runtime).</summary>
public static class JournalTreeRedFlagEvaluator
{
    public static bool EvaluateEmergency(JournalTreeDefinitionDto tree, IReadOnlyDictionary<string, JsonElement> answers)
    {
        var allChips = answers.Values
            .SelectMany(JournalTreeConditionals.ExtractChipIds)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var trigger in tree.RedFlagTriggers)
        {
            if (!string.Equals(trigger.Level, "emergency", StringComparison.OrdinalIgnoreCase))
                continue;

            if (trigger.IfAnyAnswerIds?.Any(id => allChips.Contains(id)) == true)
                return true;

            if (trigger.IfAllAnswerIds is { Count: > 0 } allIds &&
                allIds.All(id => allChips.Contains(id)))
                return true;
        }

        return false;
    }

    public static bool ShouldAskRedFlagScreen(
        JournalTreeDefinitionDto tree,
        IReadOnlyDictionary<string, JsonElement> answers,
        bool alreadyEmergency)
    {
        if (alreadyEmergency)
            return false;
        return !answers.ContainsKey("q_red_flags");
    }
}
