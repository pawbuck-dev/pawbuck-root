namespace PawBuck.API.Services;

/// <summary>Keyword gate for senior proactive notifications.</summary>
public static class ProactivePetHealthHeuristics
{
    public static bool JournalTextMatchesMobilityKeywords(string combinedJournalText, IReadOnlyList<string> keywords)
    {
        if (string.IsNullOrWhiteSpace(combinedJournalText) || keywords.Count == 0)
            return false;
        foreach (var k in keywords)
        {
            if (string.IsNullOrWhiteSpace(k))
                continue;
            if (combinedJournalText.Contains(k.Trim(), StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }
}
