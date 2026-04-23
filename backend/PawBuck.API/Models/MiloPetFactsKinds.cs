namespace PawBuck.API.Models;

/// <summary>
/// Canonical <c>dataNeeded</c> strings for the Milo plan step and <see cref="Services.IMiloPetFactsService"/> dispatch.
/// Must match Gemini JSON schema enums exactly.
/// </summary>
public static class MiloPetFactsKinds
{
    public const string Vaccinations = "vaccinations";
    public const string Medications = "medications";
    public const string LabResults = "lab_results";
    public const string ClinicalExams = "clinical_exams";
    public const string HealthSummary = "health_summary";
    public const string Journal = "journal";
    public const string None = "none";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Vaccinations,
        Medications,
        LabResults,
        ClinicalExams,
        HealthSummary,
        Journal,
        None,
    };

    /// <summary>Returns the canonical kind string, or null if the value is not in <see cref="All"/>.</summary>
    public static string? Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        var s = raw.Trim();
        foreach (var k in All)
        {
            if (string.Equals(k, s, StringComparison.OrdinalIgnoreCase))
                return k;
        }

        return null;
    }
}
