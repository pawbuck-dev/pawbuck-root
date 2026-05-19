using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

public sealed class LinkJournalEntryRequest
{
    [JsonPropertyName("petId")]
    public Guid PetId { get; set; }

    [JsonPropertyName("journalEntryId")]
    public Guid JournalEntryId { get; set; }
}

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

    /// <summary>Tree-driven journal: e.g. vomiting_v1.5. Required to start a new tree session.</summary>
    [JsonPropertyName("journalTreeId")]
    public string? JournalTreeId { get; set; }

    /// <summary>Existing tree interview session (returned on prior turn).</summary>
    [JsonPropertyName("journalSessionId")]
    public string? JournalSessionId { get; set; }

    /// <summary>Chip ids selected on the current turn (tree interview).</summary>
    [JsonPropertyName("journalChipIds")]
    public IReadOnlyList<string>? JournalChipIds { get; set; }

    /// <summary>context_continue | answer | confirm_summary | edit_summary</summary>
    [JsonPropertyName("journalAction")]
    public string? JournalAction { get; set; }

    /// <summary>Pat edited summary fields (summary_draft phase).</summary>
    [JsonPropertyName("journalSummaryFields")]
    public IReadOnlyDictionary<string, string>? JournalSummaryFields { get; set; }
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

    /// <summary>Journal mode: Phase 4 red-flag stop — client must not persist a journal entry.</summary>
    [JsonPropertyName("journalEmergencyStop")]
    public bool JournalEmergencyStop { get; set; }

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

    /// <summary>Optional structured vet-notification payload when journal mode completes (spec §4).</summary>
    [JsonPropertyName("vetNotification")]
    public MiloVetNotificationPayloadDto? VetNotification { get; set; }

    /// <summary>Optional record-backed medical lines for vet compose (server only).</summary>
    [JsonPropertyName("vetMedicalContext")]
    public MiloVetMedicalContextDto? VetMedicalContext { get; set; }

    [JsonPropertyName("interviewPhase")]
    public string? InterviewPhase { get; set; }

    [JsonPropertyName("treeId")]
    public string? TreeId { get; set; }

    [JsonPropertyName("treeVersion")]
    public string? TreeVersion { get; set; }

    [JsonPropertyName("journalSessionId")]
    public string? JournalSessionId { get; set; }

    [JsonPropertyName("questionIndex")]
    public int? QuestionIndex { get; set; }

    [JsonPropertyName("questionsAskedCount")]
    public int? QuestionsAskedCount { get; set; }

    [JsonPropertyName("contextSurface")]
    public JournalContextSurfaceDto? ContextSurface { get; set; }

    [JsonPropertyName("structuredSummary")]
    public JournalStructuredSummaryDto? StructuredSummary { get; set; }

    [JsonPropertyName("emergencyDetected")]
    public bool EmergencyDetected { get; set; }

    [JsonPropertyName("confidenceScore")]
    public decimal? ConfidenceScore { get; set; }

    [JsonPropertyName("currentQuestion")]
    public JournalCurrentQuestionDto? CurrentQuestion { get; set; }
}

/// <summary>Triage block for vet notification JSON (journal Gemini).</summary>
public sealed class MiloVetNotificationTriageDto
{
    [JsonPropertyName("level")]
    public string? Level { get; set; }

    [JsonPropertyName("rationale")]
    public string? Rationale { get; set; }

    [JsonPropertyName("confidence")]
    public double? Confidence { get; set; }
}

public sealed class MiloVetNotificationObservationDto
{
    [JsonPropertyName("taxonomy")]
    public string? Taxonomy { get; set; }

    [JsonPropertyName("displayLabel")]
    public string? DisplayLabel { get; set; }

    [JsonPropertyName("primaryChip")]
    public string? PrimaryChip { get; set; }

    [JsonPropertyName("userText")]
    public string? UserText { get; set; }

    [JsonPropertyName("onset")]
    public string? Onset { get; set; }

    [JsonPropertyName("frequency")]
    public string? Frequency { get; set; }

    [JsonPropertyName("severity")]
    public string? Severity { get; set; }

    [JsonPropertyName("trend")]
    public string? Trend { get; set; }

    [JsonPropertyName("onsetContext")]
    public string? OnsetContext { get; set; }

    /// <summary>ISO yyyy-MM-dd when onset can be anchored (journal write time).</summary>
    [JsonPropertyName("onsetDate")]
    public string? OnsetDate { get; set; }

    /// <summary>e.g. approximate when user gave a range.</summary>
    [JsonPropertyName("onsetPrecision")]
    public string? OnsetPrecision { get; set; }
}

public sealed class MiloVetNotificationPayloadDto
{
    [JsonPropertyName("triage")]
    public MiloVetNotificationTriageDto? Triage { get; set; }

    [JsonPropertyName("observations")]
    public List<MiloVetNotificationObservationDto>? Observations { get; set; }

    [JsonPropertyName("negativeFindings")]
    public List<string>? NegativeFindings { get; set; }

    [JsonPropertyName("askLine")]
    public string? AskLine { get; set; }
}

public sealed class MiloVetMedicalContextDto
{
    [JsonPropertyName("lastVisitDate")]
    public string? LastVisitDate { get; set; }

    [JsonPropertyName("lastVisitLabel")]
    public string? LastVisitLabel { get; set; }

    [JsonPropertyName("vaccinesStatus")]
    public string? VaccinesStatus { get; set; }

    [JsonPropertyName("vaccinesDetail")]
    public string? VaccinesDetail { get; set; }

    [JsonPropertyName("medicationsLine")]
    public string? MedicationsLine { get; set; }

    [JsonPropertyName("allergiesLine")]
    public string? AllergiesLine { get; set; }

    [JsonPropertyName("insuranceLine")]
    public string? InsuranceLine { get; set; }

    [JsonPropertyName("weightTrendSummary")]
    public string? WeightTrendSummary { get; set; }
}

/// <summary>Request for <c>POST /api/milo/vet-notification-draft</c> (plain-text subject + body).</summary>
public sealed class MiloVetNotificationDraftRequest
{
    [JsonPropertyName("petName")]
    public string? PetName { get; set; }

    [JsonPropertyName("breed")]
    public string? Breed { get; set; }

    [JsonPropertyName("animalType")]
    public string? AnimalType { get; set; }

    [JsonPropertyName("dateOfBirth")]
    public string? DateOfBirth { get; set; }

    [JsonPropertyName("sex")]
    public string? Sex { get; set; }

    [JsonPropertyName("weightValue")]
    public double WeightValue { get; set; }

    [JsonPropertyName("weightUnit")]
    public string? WeightUnit { get; set; }

    [JsonPropertyName("emailId")]
    public string? EmailId { get; set; }

    [JsonPropertyName("microchip")]
    public string? Microchip { get; set; }

    [JsonPropertyName("userTurns")]
    public List<string>? UserTurns { get; set; }

    [JsonPropertyName("journalSummary")]
    public string? JournalSummary { get; set; }

    [JsonPropertyName("ownerSigningName")]
    public string? OwnerSigningName { get; set; }

    [JsonPropertyName("sessionDateLabel")]
    public string? SessionDateLabel { get; set; }

    [JsonPropertyName("logIsoTimestamp")]
    public string? LogIsoTimestamp { get; set; }

    [JsonPropertyName("timezoneAbbrev")]
    public string? TimezoneAbbrev { get; set; }

    [JsonPropertyName("severity")]
    public string? Severity { get; set; }

    [JsonPropertyName("vetNotification")]
    public MiloVetNotificationPayloadDto? VetNotification { get; set; }

    [JsonPropertyName("vetMedicalContext")]
    public MiloVetMedicalContextDto? VetMedicalContext { get; set; }

    [JsonPropertyName("ownerPhone")]
    public string? OwnerPhone { get; set; }

    [JsonPropertyName("ownerEmail")]
    public string? OwnerEmail { get; set; }

    [JsonPropertyName("preferredContactLine")]
    public string? PreferredContactLine { get; set; }

    [JsonPropertyName("journalRecordId")]
    public string? JournalRecordId { get; set; }
}

public sealed class MiloVetNotificationDraftResponse
{
    [JsonPropertyName("subject")]
    public string Subject { get; set; } = "";

    [JsonPropertyName("body")]
    public string Body { get; set; } = "";
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
