using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>
/// Structured Milo vision extraction (aligned with <c>packages/milo-core</c> MedicalRecordSchema).
/// </summary>
public sealed class MedicalRecordExtraction
{
    [JsonPropertyName("petName")]
    public string? PetName { get; set; }

    [JsonPropertyName("documentType")]
    public string? DocumentType { get; set; }

    [JsonPropertyName("clinicName")]
    public string? ClinicName { get; set; }

    [JsonPropertyName("dateOfVisit")]
    public string? DateOfVisit { get; set; }

    [JsonPropertyName("items")]
    public List<MedicalRecordItem>? Items { get; set; }

    [JsonPropertyName("confidenceScore")]
    public double ConfidenceScore { get; set; }
}

public sealed class MedicalRecordItem
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("category")]
    public string Category { get; set; } = "";

    [JsonPropertyName("expiryDate")]
    public string? ExpiryDate { get; set; }
}
