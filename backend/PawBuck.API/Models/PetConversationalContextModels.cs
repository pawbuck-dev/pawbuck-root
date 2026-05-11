using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>
/// Aggregated snapshot for contextual journaling (JSON shape for prompts and logging).
/// </summary>
public sealed class PetConversationalContextDto
{
    [JsonPropertyName("petProfile")]
    public PetProfileSnapshot PetProfile { get; set; } = new();

    [JsonPropertyName("recentMedicalHistory")]
    public List<RecentMedicalEvent> RecentMedicalHistory { get; set; } = new();

    [JsonPropertyName("recentJournalNotes")]
    public List<RecentJournalNote> RecentJournalNotes { get; set; } = new();

    [JsonPropertyName("upcomingMilestones")]
    public List<UpcomingMilestone> UpcomingMilestones { get; set; } = new();

    /// <summary>
    /// Owner-provided "what is normal for this pet" snapshot. Null when the owner
    /// has not yet completed the baseline. Surfaced in journal-mode prompts so the
    /// model can contrast today's free-text entry against stored norms.
    /// </summary>
    [JsonPropertyName("behaviorBaseline")]
    public BehaviorBaselineSnapshot? BehaviorBaseline { get; set; }
}

public sealed class BehaviorBaselineSnapshot
{
    [JsonPropertyName("energyLevel1To5")]
    public int EnergyLevel1To5 { get; set; }

    [JsonPropertyName("socialDisposition")]
    public string SocialDisposition { get; set; } = "";

    [JsonPropertyName("foodMotivation")]
    public string FoodMotivation { get; set; } = "";

    [JsonPropertyName("typicalDeepSleepHours")]
    public double? TypicalDeepSleepHours { get; set; }

    [JsonPropertyName("sleepRestfulness")]
    public string? SleepRestfulness { get; set; }

    [JsonPropertyName("sleepSafeSpot")]
    public string? SleepSafeSpot { get; set; }

    [JsonPropertyName("vocalizationLevel")]
    public string VocalizationLevel { get; set; } = "";

    [JsonPropertyName("vocalizationTriggers")]
    public List<string> VocalizationTriggers { get; set; } = new();

    [JsonPropertyName("stressTriggers")]
    public List<string> StressTriggers { get; set; } = new();
}

public sealed class PetProfileSnapshot
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("species")]
    public string Species { get; set; } = "";

    [JsonPropertyName("breed")]
    public string Breed { get; set; } = "";

    [JsonPropertyName("dateOfBirth")]
    public string? DateOfBirth { get; set; }

    [JsonPropertyName("ageYears")]
    public double? AgeYears { get; set; }

    [JsonPropertyName("ageDisplay")]
    public string AgeDisplay { get; set; } = "";

    [JsonPropertyName("isSenior")]
    public bool IsSenior { get; set; }

    [JsonPropertyName("sex")]
    public string Sex { get; set; } = "";

    [JsonPropertyName("weightValue")]
    public decimal WeightValue { get; set; }

    [JsonPropertyName("weightUnit")]
    public string WeightUnit { get; set; } = "";
}

public sealed class RecentMedicalEvent
{
    /// <summary>vaccination | medication_started | surgery | clinical_exam</summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("date")]
    public string Date { get; set; } = "";

    [JsonPropertyName("details")]
    public string? Details { get; set; }
}

public sealed class RecentJournalNote
{
    [JsonPropertyName("domain")]
    public string Domain { get; set; } = "";

    [JsonPropertyName("subtype")]
    public string Subtype { get; set; } = "";

    [JsonPropertyName("note")]
    public string? Note { get; set; }

    [JsonPropertyName("entryDate")]
    public string EntryDate { get; set; } = "";

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = "";
}

public sealed class UpcomingMilestone
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("label")]
    public string Label { get; set; } = "";

    [JsonPropertyName("dueDate")]
    public string DueDate { get; set; } = "";

    [JsonPropertyName("details")]
    public string? Details { get; set; }
}
