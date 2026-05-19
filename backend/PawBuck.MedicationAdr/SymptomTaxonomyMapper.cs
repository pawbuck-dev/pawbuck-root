using System.Text.RegularExpressions;

namespace PawBuck.MedicationAdr;

public sealed class SymptomMapping
{
    public required string TaxonomyKey { get; init; }
    public required string Snippet { get; init; }
    public decimal Confidence { get; init; }
}

/// <summary>Maps SPL adverse-reaction text to journal tree symptom taxonomy keys.</summary>
public static class SymptomTaxonomyMapper
{
    private static readonly (string Key, Regex Pattern, decimal Confidence)[] Rules =
    [
        ("vomiting", new Regex(@"\bvomit", RegexOptions.IgnoreCase | RegexOptions.Compiled), 0.92m),
        ("diarrhea", new Regex(@"\bdiarrh", RegexOptions.IgnoreCase | RegexOptions.Compiled), 0.92m),
        ("lethargy", new Regex(@"\bletharg|\bdepress(ed)?\b|\bweakness\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 0.88m),
        ("pruritus", new Regex(@"\bprurit|\bscratch|\bitc(h|hing)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 0.90m),
        ("anorexia", new Regex(@"\banorexi|\bappetite\s+(loss|decreas)", RegexOptions.IgnoreCase | RegexOptions.Compiled), 0.88m),
        ("polyuria", new Regex(@"\bpolyuria|\bincreased\s+urin", RegexOptions.IgnoreCase | RegexOptions.Compiled), 0.85m),
        ("cough", new Regex(@"\bcough", RegexOptions.IgnoreCase | RegexOptions.Compiled), 0.86m),
    ];

    public static IReadOnlyList<SymptomMapping> MapText(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return Array.Empty<SymptomMapping>();

        var results = new List<SymptomMapping>();
        foreach (var (key, pattern, confidence) in Rules)
        {
            if (!pattern.IsMatch(text))
                continue;
            var snippet = ExtractSnippet(text, pattern);
            results.Add(new SymptomMapping
            {
                TaxonomyKey = key,
                Snippet = snippet,
                Confidence = confidence,
            });
        }

        return results;
    }

    private static string ExtractSnippet(string text, Regex pattern)
    {
        var m = pattern.Match(text);
        if (!m.Success)
            return text.Length <= 120 ? text.Trim() : text[..120].Trim() + "…";

        var start = Math.Max(0, m.Index - 40);
        var len = Math.Min(text.Length - start, 120);
        var slice = text.Substring(start, len).Replace('\n', ' ').Trim();
        return slice.Length <= 120 ? slice : slice[..120] + "…";
    }
}
