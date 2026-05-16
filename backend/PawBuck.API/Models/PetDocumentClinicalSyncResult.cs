using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>Result of syncing a vault row into structured clinical tables.</summary>
public sealed class PetDocumentClinicalSyncResult
{
    [JsonPropertyName("synced")]
    public bool Synced { get; set; }

    [JsonPropertyName("vaccinationsCreated")]
    public int VaccinationsCreated { get; set; }

    [JsonPropertyName("medicationsCreated")]
    public int MedicationsCreated { get; set; }

    [JsonPropertyName("clinicalExamsCreated")]
    public int ClinicalExamsCreated { get; set; }

    [JsonPropertyName("labResultsCreated")]
    public int LabResultsCreated { get; set; }

    [JsonPropertyName("skippedDuplicates")]
    public int SkippedDuplicates { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }

    [JsonPropertyName("clinicalRowsCreated")]
    public int ClinicalRowsCreated =>
        VaccinationsCreated + MedicationsCreated + ClinicalExamsCreated + LabResultsCreated;
}
