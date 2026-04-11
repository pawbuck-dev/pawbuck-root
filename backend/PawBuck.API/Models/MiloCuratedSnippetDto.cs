using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>
/// A curated educational snippet for Milo (breed/species grounding).
/// </summary>
public class MiloCuratedSnippetDto
{
    [JsonPropertyName("topic")]
    public string Topic { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("sourceAttribution")]
    public string SourceAttribution { get; set; } = string.Empty;
}
