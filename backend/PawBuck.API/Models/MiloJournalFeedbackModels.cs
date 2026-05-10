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
