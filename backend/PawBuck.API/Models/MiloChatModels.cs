using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>POST /api/milo/chat request body.</summary>
public class MiloChatRequest
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = "";

    [JsonPropertyName("pet")]
    public MiloPetContextDto? Pet { get; set; }

    [JsonPropertyName("history")]
    public IReadOnlyList<MiloChatHistoryMessage>? History { get; set; }

    /// <summary>
    /// When true, runs the journal interview flow: JSON answer + suggested quick replies + completion flag.
    /// Requires a verified pet in <see cref="Pet"/>.
    /// </summary>
    [JsonPropertyName("journalMode")]
    public bool JournalMode { get; set; }
}

public class MiloPetContextDto
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("animal_type")]
    public string? AnimalType { get; set; }

    [JsonPropertyName("breed")]
    public string? Breed { get; set; }

    [JsonPropertyName("date_of_birth")]
    public string? DateOfBirth { get; set; }

    [JsonPropertyName("sex")]
    public string? Sex { get; set; }

    [JsonPropertyName("weight_value")]
    public double WeightValue { get; set; }

    [JsonPropertyName("weight_unit")]
    public string? WeightUnit { get; set; }
}

public class MiloChatHistoryMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";

    [JsonPropertyName("content")]
    public string Content { get; set; } = "";
}

/// <summary>POST /api/milo/chat response.</summary>
public class MiloChatResponse
{
    [JsonPropertyName("answer")]
    public string Answer { get; set; } = "";

    [JsonPropertyName("usedPetData")]
    public bool UsedPetData { get; set; }

    [JsonPropertyName("usedRag")]
    public bool UsedRag { get; set; }

    /// <summary>Short plan/reasoning from the model (optional; may be omitted when <see cref="MiloOptions.ExposePlanSummary"/> is false).</summary>
    [JsonPropertyName("planSummary")]
    public string? PlanSummary { get; set; }

    [JsonPropertyName("petName")]
    public string? PetName { get; set; }

    /// <summary>Quick-reply chips for journal mode (empty when <see cref="JournalSessionComplete"/> is true).</summary>
    [JsonPropertyName("suggestedReplies")]
    public IReadOnlyList<string>? SuggestedReplies { get; set; }

    /// <summary>When true, the journal interview is finished and the client should persist one entry.</summary>
    [JsonPropertyName("journalSessionComplete")]
    public bool JournalSessionComplete { get; set; }
}

/// <summary>Gemini plan step (JSON). Property names match API camelCase.</summary>
public class MiloChatPlanDto
{
    [JsonPropertyName("dataNeeded")]
    public List<string>? DataNeeded { get; set; }

    [JsonPropertyName("needsDocumentationRag")]
    public bool NeedsDocumentationRag { get; set; }

    [JsonPropertyName("reasoningBrief")]
    public string? ReasoningBrief { get; set; }
}
