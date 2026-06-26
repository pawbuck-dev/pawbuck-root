using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

public static class JournalInterviewPhases
{
    public const string ContextSurface = "context_surface";
    public const string Question = "question";
    public const string SummaryDraft = "summary_draft";
    public const string Complete = "complete";
    public const string Abandoned = "abandoned";
}

public sealed class JournalContextSurfaceLineDto
{
    [JsonPropertyName("kind")]
    public string Kind { get; init; } = "ok"; // ok | warn | gap

    [JsonPropertyName("text")]
    public required string Text { get; init; }
}

public sealed class JournalContextSurfaceActionDto
{
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    [JsonPropertyName("label")]
    public required string Label { get; init; }
}

public sealed class JournalContextSurfaceDto
{
    [JsonPropertyName("lines")]
    public IReadOnlyList<JournalContextSurfaceLineDto> Lines { get; init; } = Array.Empty<JournalContextSurfaceLineDto>();

    [JsonPropertyName("actions")]
    public IReadOnlyList<JournalContextSurfaceActionDto> Actions { get; init; } = Array.Empty<JournalContextSurfaceActionDto>();

    [JsonPropertyName("adrWarning")]
    public string? AdrWarning { get; init; }

    [JsonPropertyName("confidence")]
    public decimal Confidence { get; init; } = 0.9m;

    [JsonPropertyName("sparseRecord")]
    public bool SparseRecord { get; init; }

    [JsonPropertyName("puppyGiWarning")]
    public string? PuppyGiWarning { get; init; }

    [JsonPropertyName("brachyWarning")]
    public string? BrachyWarning { get; init; }
}

public sealed class JournalStructuredSummaryDto
{
    [JsonPropertyName("fields")]
    public IReadOnlyDictionary<string, string> Fields { get; init; } = new Dictionary<string, string>();

    [JsonPropertyName("redFlags")]
    public IReadOnlyList<string> RedFlags { get; init; } = Array.Empty<string>();

    [JsonPropertyName("attachmentHint")]
    public bool AttachmentHint { get; init; }

    [JsonPropertyName("confidenceScore")]
    public decimal? ConfidenceScore { get; init; }

    [JsonPropertyName("lowConfidence")]
    public bool LowConfidence { get; init; }
}

public sealed class JournalTreeChipOptionDto
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = "";

    [JsonPropertyName("label")]
    public string Label { get; init; } = "";

    [JsonPropertyName("drilldownPrompt")]
    public string? DrilldownPrompt { get; init; }

    [JsonPropertyName("drilldownOptional")]
    public bool DrilldownOptional { get; init; }
}

/// <summary>Active tree question for rich client UI (chips with ids).</summary>
public sealed class JournalCurrentQuestionDto
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = "";

    [JsonPropertyName("type")]
    public string Type { get; init; } = "single";

    [JsonPropertyName("prompt")]
    public string Prompt { get; init; } = "";

    [JsonPropertyName("options")]
    public IReadOnlyList<JournalTreeChipOptionDto> Options { get; init; } = Array.Empty<JournalTreeChipOptionDto>();

    [JsonPropertyName("stage1Options")]
    public IReadOnlyList<JournalTreeChipOptionDto>? Stage1Options { get; init; }

    [JsonPropertyName("stage2Options")]
    public IReadOnlyList<JournalTreeChipOptionDto>? Stage2Options { get; init; }

    [JsonPropertyName("allowMulti")]
    public bool AllowMulti { get; init; }
}

public sealed class JournalTreeQuestionDto
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = "";

    [JsonPropertyName("step")]
    public int Step { get; init; }

    [JsonPropertyName("prompt")]
    public string Prompt { get; init; } = "";

    [JsonPropertyName("type")]
    public string Type { get; init; } = "single";

    [JsonPropertyName("options")]
    public List<JournalTreeChipOptionDto>? Options { get; init; }

    [JsonPropertyName("stage1Options")]
    public List<JournalTreeChipOptionDto>? Stage1Options { get; init; }

    [JsonPropertyName("stage2Options")]
    public List<JournalTreeChipOptionDto>? Stage2Options { get; init; }

    [JsonPropertyName("skipToQuestionId")]
    public string? SkipToQuestionId { get; init; }

    [JsonPropertyName("conditionalOn")]
    public string? ConditionalOn { get; init; }
}

public sealed class JournalTreeRedFlagTriggerDto
{
    [JsonPropertyName("ifAnyAnswerIds")]
    public List<string>? IfAnyAnswerIds { get; init; }

    [JsonPropertyName("ifAllAnswerIds")]
    public List<string>? IfAllAnswerIds { get; init; }

    [JsonPropertyName("level")]
    public string Level { get; init; } = "urgent";
}

public sealed class JournalTreeDefinitionDto
{
    [JsonPropertyName("treeId")]
    public string TreeId { get; init; } = "";

    [JsonPropertyName("topic")]
    public string Topic { get; init; } = "";

    [JsonPropertyName("version")]
    public string Version { get; init; } = "";

    [JsonPropertyName("symptomTaxonomy")]
    public List<string> SymptomTaxonomy { get; init; } = new();

    [JsonPropertyName("contextSurface")]
    public JournalTreeContextSurfaceConfigDto ContextSurface { get; init; } = new();

    [JsonPropertyName("maxQuestions")]
    public int MaxQuestions { get; init; } = 6;

    [JsonPropertyName("questions")]
    public List<JournalTreeQuestionDto> Questions { get; init; } = new();

    [JsonPropertyName("redFlagTriggers")]
    public List<JournalTreeRedFlagTriggerDto> RedFlagTriggers { get; init; } = new();

    [JsonPropertyName("summaryFieldMap")]
    public Dictionary<string, string> SummaryFieldMap { get; init; } = new();
}

public sealed class JournalTreeContextSurfaceConfigDto
{
    [JsonPropertyName("alwaysSurface")]
    public List<string> AlwaysSurface { get; init; } = new();

    [JsonPropertyName("adrSymptomKeys")]
    public List<string>? AdrSymptomKeys { get; init; }

    [JsonPropertyName("puppyGiWarning")]
    public bool PuppyGiWarning { get; init; }
}
