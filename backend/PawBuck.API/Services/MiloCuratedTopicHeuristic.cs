namespace PawBuck.API.Services;

/// <summary>Detects when Milo chat should load curated educational snippets (SQL, not vectors).</summary>
public static class MiloCuratedTopicHeuristic
{
    public static bool ShouldFetchCurated(string? message) => InferTopic(message) != null;

    /// <summary>Returns curated topic key or null when message is unrelated.</summary>
    public static string? InferTopic(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return null;

        var t = message.ToLowerInvariant();

        if (MatchesWeightTopic(t))
            return "weight_range";

        if (MatchesVaccineTopic(t))
            return "vaccine_guidance";

        if (MatchesParasiteTopic(t))
            return "parasite_prevention";

        if (MatchesNutritionTopic(t))
            return "nutrition_basics";

        return null;
    }

    private static bool MatchesWeightTopic(string t) =>
        t.Contains("weight") || t.Contains("overweight") || t.Contains("obese") || t.Contains("body condition")
        || t.Contains("pound") || t.Contains(" lb") || t.StartsWith("lb ") || t.Contains("lbs")
        || (t.Contains("how much should") && (t.Contains("weigh") || t.Contains("weighs")))
        || t.Contains("healthy range") || t.Contains("growth chart") || t.Contains("puppy weight")
        || t.Contains("too fat") || t.Contains("too thin") || t.Contains("ideal weight");

    private static bool MatchesVaccineTopic(string t) =>
        (t.Contains("vaccin") || t.Contains("immuniz") || t.Contains("booster") || t.Contains("shot"))
        && !t.Contains("how do i upload") && !t.Contains("where in the app");

    private static bool MatchesParasiteTopic(string t) =>
        t.Contains("heartworm") || t.Contains("flea") || t.Contains("tick") || t.Contains("lyme")
        || t.Contains("intestinal worm") || t.Contains("deworm") || t.Contains("parasite");

    private static bool MatchesNutritionTopic(string t) =>
        t.Contains("aafco") || t.Contains("nutrition") || t.Contains("diet") || t.Contains("food portion")
        || t.Contains("how much to feed") || t.Contains("how much should i feed") || t.Contains("how much should we feed")
        || (t.Contains("treat") && t.Contains("limit"))
        || t.Contains("puppy food") || t.Contains("kitten food") || t.Contains("calorie");
}
