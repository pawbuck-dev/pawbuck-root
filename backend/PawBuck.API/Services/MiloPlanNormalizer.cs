using Microsoft.Extensions.Logging;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Maps plan <c>dataNeeded</c> strings to a fetch list aligned with <see cref="MiloPetFactsKinds"/>.
/// </summary>
public static class MiloPlanNormalizer
{
    /// <summary>
    /// Unknown entries are skipped (logged). <c>none</c> is ignored.
    /// If <see cref="MiloPetFactsKinds.HealthSummary"/> appears, the result is <c>health_summary</c> then <c>journal</c>
    /// so normal Milo chat includes recent owner journal notes with the clinical summary.
    /// </summary>
    public static IReadOnlyList<string> NormalizeDataNeeded(
        IReadOnlyList<string>? dataNeeded,
        ILogger logger)
    {
        if (dataNeeded == null || dataNeeded.Count == 0)
            return Array.Empty<string>();

        var set = new HashSet<string>(StringComparer.Ordinal);
        foreach (var raw in dataNeeded)
        {
            var n = MiloPetFactsKinds.Normalize(raw);
            if (n == null)
            {
                logger.LogWarning("Milo plan ignored unknown dataNeeded value: {Value}", raw);
                continue;
            }

            if (n == MiloPetFactsKinds.None)
                continue;
            if (n == MiloPetFactsKinds.HealthSummary)
                return new[] { MiloPetFactsKinds.HealthSummary, MiloPetFactsKinds.Journal };
            set.Add(n);
        }

        return set.ToList();
    }
}
