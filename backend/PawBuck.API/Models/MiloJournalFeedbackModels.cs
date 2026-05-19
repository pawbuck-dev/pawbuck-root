using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

public sealed class MiloJournalFeedbackRequest
{
    [JsonPropertyName("responseId")]
    public Guid ResponseId { get; set; }

    /// <summary>Same as <see cref="ResponseId"/> (optional; preferred by newer clients).</summary>
    [JsonPropertyName("turnId")]
    public string? TurnId { get; set; }

    /// <summary>"up" or "down"</summary>
    [JsonPropertyName("rating")]
    public string Rating { get; set; } = "";

    [JsonPropertyName("feedbackReason")]
    public string? FeedbackReason { get; set; }

    [JsonPropertyName("treeVersion")]
    public string? TreeVersion { get; set; }

    [JsonPropertyName("questionsAsked")]
    public int? QuestionsAsked { get; set; }

    [JsonPropertyName("feedbackStage")]
    public string? FeedbackStage { get; set; }
}

public sealed class MiloJournalConfigPatchRequest
{
    [JsonPropertyName("config")]
    public MiloJournalConfigSnapshot? Config { get; set; }
}

public sealed class MiloJournalFeedbackAggregatesDto
{
    [JsonPropertyName("totalFeedback")]
    public int TotalFeedback { get; set; }

    [JsonPropertyName("upCount")]
    public int UpCount { get; set; }

    [JsonPropertyName("downCount")]
    public int DownCount { get; set; }

    [JsonPropertyName("byPromptVersion")]
    public List<MiloJournalFeedbackByVersionDto> ByPromptVersion { get; set; } = new();

    [JsonPropertyName("byTreeVersion")]
    public List<MiloJournalFeedbackByVersionDto> ByTreeVersion { get; set; } = new();
}

public sealed class MiloJournalFeedbackByVersionDto
{
    [JsonPropertyName("promptVersion")]
    public string PromptVersion { get; set; } = "";

    [JsonPropertyName("upCount")]
    public int UpCount { get; set; }

    [JsonPropertyName("downCount")]
    public int DownCount { get; set; }
}
