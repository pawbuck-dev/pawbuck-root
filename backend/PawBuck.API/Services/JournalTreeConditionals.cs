using System.Text.Json;

namespace PawBuck.API.Services;

/// <summary>Evaluates tree question branch rules from stored chip answers.</summary>
public static class JournalTreeConditionals
{
    public static bool PassesConditional(
        string? conditionalOn,
        Dictionary<string, JsonElement> answers)
    {
        if (string.IsNullOrEmpty(conditionalOn))
            return true;

        return conditionalOn switch
        {
            "vomiting_or_both" => HasChip(answers, "q_type", "vomiting", "both"),
            "diarrhea_or_both" => HasChip(answers, "q_type", "diarrhea", "both"),
            "eating_less_or_wont_eat" => HasChip(answers, "q_direction_onset", "eating_less", "wont_eat"),
            "eating_more_or_asking" => HasChip(answers, "q_direction_onset", "eating_more", "asking_food"),
            "eye_or_both" => HasChip(answers, "q_type", "eye", "both"),
            "ear_or_both" => HasChip(answers, "q_type", "ear", "both"),
            _ => false,
        };
    }

    public static bool HasChip(
        Dictionary<string, JsonElement> answers,
        string questionId,
        params string[] chipIds)
    {
        if (!answers.TryGetValue(questionId, out var el))
            return false;
        var chips = ExtractChipIds(el);
        return chipIds.Any(id => chips.Contains(id, StringComparer.OrdinalIgnoreCase));
    }

    public static List<string> ExtractChipIds(JsonElement el)
    {
        var list = new List<string>();
        if (el.ValueKind == JsonValueKind.Object &&
            el.TryGetProperty("chips", out var chips) &&
            chips.ValueKind == JsonValueKind.Array)
        {
            foreach (var c in chips.EnumerateArray())
            {
                var s = c.GetString();
                if (!string.IsNullOrEmpty(s))
                    list.Add(s);
            }
        }
        return list;
    }
}
