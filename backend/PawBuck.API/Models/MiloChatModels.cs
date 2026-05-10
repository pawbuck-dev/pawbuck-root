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

/// <summary>Health record file linked to a Milo reply (storage path in Supabase bucket).</summary>
public class MiloChatFileAttachment
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    /// <summary>One of: vaccination, medicine, lab_result, clinical_exam.</summary>
    [JsonPropertyName("kind")]
    public string Kind { get; set; } = "";

    [JsonPropertyName("title")]
    public string Title { get; set; } = "";

    [JsonPropertyName("storagePath")]
    public string StoragePath { get; set; } = "";
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

    /// <summary>Journal mode: model status from the last turn ("CONTINUE" or "COMPLETE").</summary>
    [JsonPropertyName("journalStatus")]
    public string? JournalStatus { get; set; }

    /// <summary>Journal mode: structured summary when the session completed.</summary>
    [JsonPropertyName("journalSummary")]
    public string? JournalSummary { get; set; }

    /// <summary>Server id for this assistant turn; use with POST <c>/api/milo/chat/feedback</c> body <c>responseId</c> or <c>turnId</c>.</summary>
    [JsonPropertyName("responseId")]
    public Guid? ResponseId { get; set; }

    /// <summary>Same as <see cref="ResponseId"/> as a string (client convenience).</summary>
    [JsonPropertyName("turnId")]
    public string? TurnId { get; set; }

    /// <summary>Prompt pack version from journal config (journal mode).</summary>
    [JsonPropertyName("promptVersion")]
    public string? PromptVersion { get; set; }

    /// <summary>Heuristic tags applied when generating this response (journal mode).</summary>
    [JsonPropertyName("heuristicTags")]
    public IReadOnlyList<string>? HeuristicTags { get; set; }

    /// <summary>Recent health record documents tied to the facts loaded for this turn (for in-chat file chips).</summary>
    [JsonPropertyName("fileAttachments")]
    public IReadOnlyList<MiloChatFileAttachment>? FileAttachments { get; set; }
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
