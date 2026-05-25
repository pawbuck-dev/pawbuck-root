using System.Text.Json;
using System.Text.RegularExpressions;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Builds structured journal summary fields from tree templates and stored answers.</summary>
public static class JournalTreeSummaryBuilder
{
    private static readonly Regex PlaceholderRegex = new(@"\{([^}:]+)(?::([^}]+))?\}", RegexOptions.Compiled);

    private static readonly HashSet<string> SystemicAppetiteChipIds = new(StringComparer.OrdinalIgnoreCase)
    {
        "eating_ok", "off_food", "drinking_ok", "drinking_less",
    };

    private static readonly HashSet<string> SystemicEnergyChipIds = new(StringComparer.OrdinalIgnoreCase)
    {
        "energy_ok", "tired", "hiding", "belly_pain",
    };

    public static Dictionary<string, string> BuildFields(
        JournalTreeDefinitionDto tree,
        Dictionary<string, JsonElement> answers,
        string petName)
    {
        var fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (key, template) in tree.SummaryFieldMap)
        {
            fields[key] = ResolveTemplate(template, tree, answers, petName);
        }

        MergeConflictingSummaryFields(fields);
        return fields;
    }

    public static string ResolveTemplate(
        string template,
        JournalTreeDefinitionDto tree,
        Dictionary<string, JsonElement> answers,
        string petName)
    {
        if (string.IsNullOrWhiteSpace(template))
            return "Not specified";

        if (!template.Contains('{', StringComparison.Ordinal))
            return template.Trim();

        var parts = new List<string>();
        var lastIndex = 0;
        foreach (Match match in PlaceholderRegex.Matches(template))
        {
            if (match.Index > lastIndex)
            {
                var literal = template[lastIndex..match.Index].Trim();
                if (literal.Length > 0)
                    parts.Add(literal);
            }

            var questionId = match.Groups[1].Value.Trim();
            var slice = match.Groups[2].Success ? match.Groups[2].Value.Trim() : null;
            if (answers.TryGetValue(questionId, out var el))
            {
                var formatted = FormatAnswerForSummary(el, tree, questionId, slice);
                if (!string.IsNullOrWhiteSpace(formatted))
                    parts.Add(formatted);
            }

            lastIndex = match.Index + match.Length;
        }

        if (lastIndex < template.Length)
        {
            var tail = template[lastIndex..].Trim();
            if (tail.Length > 0)
                parts.Add(tail);
        }

        if (parts.Count == 0)
            return "Not specified";

        var joined = string.Join(" / ", parts);
        return CollapseNotSpecified(joined);
    }

    private static string FormatAnswerForSummary(
        JsonElement el,
        JournalTreeDefinitionDto tree,
        string questionId,
        string? slice)
    {
        var chipIds = JournalTreeConditionals.ExtractChipIds(el);
        var text = el.ValueKind == JsonValueKind.Object &&
                   el.TryGetProperty("text", out var textEl) &&
                   textEl.ValueKind == JsonValueKind.String
            ? textEl.GetString() ?? ""
            : "";

        if (!string.IsNullOrWhiteSpace(slice) && chipIds.Count > 0)
        {
            var labels = MapChipIdsToLabels(tree, questionId, chipIds, slice);
            if (labels.Count > 0)
                return string.Join(", ", labels);
        }

        if (!string.IsNullOrWhiteSpace(text))
            return text.Trim();

        if (chipIds.Count > 0)
        {
            var labels = MapChipIdsToLabels(tree, questionId, chipIds, slice: null);
            if (labels.Count > 0)
                return string.Join(", ", labels);
        }

        return "";
    }

    private static List<string> MapChipIdsToLabels(
        JournalTreeDefinitionDto tree,
        string questionId,
        IReadOnlyList<string> chipIds,
        string? slice)
    {
        var q = tree.Questions.FirstOrDefault(x =>
            string.Equals(x.Id, questionId, StringComparison.OrdinalIgnoreCase));
        if (q == null)
            return chipIds.ToList();

        var idToLabel = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        void AddOptions(IEnumerable<JournalTreeChipOptionDto>? options)
        {
            if (options == null) return;
            foreach (var o in options)
                idToLabel[o.Id] = o.Label;
        }

        AddOptions(q.Options);
        AddOptions(q.Stage1Options);
        AddOptions(q.Stage2Options);

        var filtered = chipIds.Where(id => PassesSlice(id, slice));
        var labels = new List<string>();
        foreach (var id in filtered)
        {
            if (idToLabel.TryGetValue(id, out var label))
                labels.Add(label);
            else if (!string.IsNullOrWhiteSpace(id) && !id.Contains(' '))
                labels.Add(id.Replace('_', ' '));
        }

        return labels;
    }

    private static bool PassesSlice(string chipId, string? slice)
    {
        if (string.IsNullOrWhiteSpace(slice))
            return true;
        return slice.ToLowerInvariant() switch
        {
            "appetite" => SystemicAppetiteChipIds.Contains(chipId),
            "energy" => SystemicEnergyChipIds.Contains(chipId),
            _ => true,
        };
    }

    private static string CollapseNotSpecified(string value)
    {
        var trimmed = value.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return "Not specified";

        var normalized = Regex.Replace(trimmed, @"\bNot specified\b(\s+\bNot specified\b)+", "Not specified", RegexOptions.IgnoreCase);
        normalized = Regex.Replace(normalized, @"\s{2,}", " ").Trim();
        if (string.Equals(normalized, "Not specified", StringComparison.OrdinalIgnoreCase))
            return "Not specified";
        if (normalized.Contains("Not specified", StringComparison.OrdinalIgnoreCase) &&
            normalized.Replace("Not specified", "", StringComparison.OrdinalIgnoreCase).Trim().Length == 0)
            return "Not specified";
        return normalized;
    }

    private static void MergeConflictingSummaryFields(Dictionary<string, string> fields)
    {
        foreach (var key in fields.Keys.ToList())
        {
            var value = fields[key];
            if (value.Contains("Not specified", StringComparison.OrdinalIgnoreCase) &&
                value.Contains('/', StringComparison.Ordinal))
            {
                var parts = value.Split('/').Select(p => p.Trim()).Where(p => p.Length > 0).ToList();
                var concrete = parts.Where(p =>
                    !p.Contains("Not specified", StringComparison.OrdinalIgnoreCase)).ToList();
                if (concrete.Count > 0)
                    fields[key] = string.Join(" / ", concrete);
            }
        }
    }
}
