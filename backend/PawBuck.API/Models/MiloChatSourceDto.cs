using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>Grounding source cited in a Milo chat reply (Phase 1B).</summary>
public sealed class MiloChatSourceDto
{
    /// <summary>documentation | curated | pet_record</summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("label")]
    public string Label { get; set; } = "";

    [JsonPropertyName("id")]
    public string? Id { get; set; }
}
