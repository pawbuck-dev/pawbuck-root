using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>Milo vision flexible JSON extraction (see MiloVisionService response schema).</summary>
public sealed class FlexibleVaultExtraction
{
    public string? Title { get; set; }

    public string? Summary { get; set; }

    [JsonPropertyName("primaryDate")]
    public string? PrimaryDate { get; set; }

    public List<FlexibleKeyFact>? KeyFacts { get; set; }

    [JsonPropertyName("confidenceScore")]
    public double ConfidenceScore { get; set; }
}

public sealed class FlexibleKeyFact
{
    public string Label { get; set; } = "";

    public string Value { get; set; } = "";
}
