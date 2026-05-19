using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>
/// Tunable journal Milo settings (DB JSON merged with <see cref="Defaults"/>).
/// </summary>
public sealed class MiloJournalConfigSnapshot
{
    public const string DefaultId = "default";

    [JsonPropertyName("recentMedicalWindowDays")]
    public int RecentMedicalWindowDays { get; set; } = 14;

    [JsonPropertyName("upcomingMilestoneWindowDays")]
    public int UpcomingMilestoneWindowDays { get; set; } = 30;

    [JsonPropertyName("recentJournalNotesCount")]
    public int RecentJournalNotesCount { get; set; } = 3;

    [JsonPropertyName("seniorAgeYears")]
    public int SeniorAgeYears { get; set; } = 8;

    [JsonPropertyName("postVaccineFocusDays")]
    public int PostVaccineFocusDays { get; set; } = 3;

    [JsonPropertyName("newMedicationFocusDays")]
    public int NewMedicationFocusDays { get; set; } = 7;

    [JsonPropertyName("limpingLookbackHours")]
    public int LimpingLookbackHours { get; set; } = 48;

    [JsonPropertyName("quietJournalDays")]
    public int QuietJournalDays { get; set; } = 7;

    /// <summary>ILIKE substrings for clinical_exams.exam_type (surgery-style visits).</summary>
    [JsonPropertyName("surgeryExamTypePatterns")]
    public List<string> SurgeryExamTypePatterns { get; set; } = new()
    {
        "surgery", "spay", "neuter", "dental", "extract", "procedure",
    };

    [JsonPropertyName("promptVersion")]
    public string PromptVersion { get; set; } = "v3";

    [JsonPropertyName("journalTemperature")]
    public double JournalTemperature { get; set; } = 0.65;

    [JsonPropertyName("journalMaxOutputTokens")]
    public int JournalMaxOutputTokens { get; set; } = 1024;

    /// <summary>When true, journal mode uses JSON decision-tree interviews instead of the legacy LLM checklist.</summary>
    [JsonPropertyName("journalTreeInterviewEnabled")]
    public bool JournalTreeInterviewEnabled { get; set; } = true;

    public static MiloJournalConfigSnapshot Defaults() => new();

    /// <summary>Merge JSON-overridden fields from <paramref name="overrides"/> into a copy of defaults.</summary>
    public static MiloJournalConfigSnapshot Merge(MiloJournalConfigSnapshot? overrides)
    {
        var d = Defaults();
        if (overrides == null)
            return d;

        if (overrides.RecentMedicalWindowDays > 0)
            d.RecentMedicalWindowDays = overrides.RecentMedicalWindowDays;
        if (overrides.UpcomingMilestoneWindowDays > 0)
            d.UpcomingMilestoneWindowDays = overrides.UpcomingMilestoneWindowDays;
        if (overrides.RecentJournalNotesCount > 0)
            d.RecentJournalNotesCount = overrides.RecentJournalNotesCount;
        if (overrides.SeniorAgeYears > 0)
            d.SeniorAgeYears = overrides.SeniorAgeYears;
        if (overrides.PostVaccineFocusDays > 0)
            d.PostVaccineFocusDays = overrides.PostVaccineFocusDays;
        if (overrides.NewMedicationFocusDays > 0)
            d.NewMedicationFocusDays = overrides.NewMedicationFocusDays;
        if (overrides.LimpingLookbackHours > 0)
            d.LimpingLookbackHours = overrides.LimpingLookbackHours;
        if (overrides.QuietJournalDays > 0)
            d.QuietJournalDays = overrides.QuietJournalDays;
        if (overrides.SurgeryExamTypePatterns is { Count: > 0 })
            d.SurgeryExamTypePatterns = new List<string>(overrides.SurgeryExamTypePatterns);
        if (!string.IsNullOrWhiteSpace(overrides.PromptVersion))
            d.PromptVersion = overrides.PromptVersion.Trim();
        if (overrides.JournalTemperature is > 0 and < 2)
            d.JournalTemperature = overrides.JournalTemperature;
        if (overrides.JournalMaxOutputTokens is >= 256 and <= 8192)
            d.JournalMaxOutputTokens = overrides.JournalMaxOutputTokens;

        d.JournalTreeInterviewEnabled = overrides.JournalTreeInterviewEnabled;

        return d;
    }
}
