using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

public class SupportDocumentProcessingMetricsResponse
{
    [JsonPropertyName("from")]
    public DateTimeOffset From { get; set; }

    [JsonPropertyName("to")]
    public DateTimeOffset To { get; set; }

    [JsonPropertyName("email")]
    public SupportEmailProcessingMetricsDto Email { get; set; } = new();

    [JsonPropertyName("vault")]
    public SupportVaultProcessingMetricsDto Vault { get; set; } = new();
}

public class SupportEmailProcessingMetricsDto
{
    [JsonPropertyName("totalCompleted")]
    public int TotalCompleted { get; set; }

    [JsonPropertyName("totalSucceeded")]
    public int TotalSucceeded { get; set; }

    [JsonPropertyName("totalFailed")]
    public int TotalFailed { get; set; }

    [JsonPropertyName("successRate")]
    public double SuccessRate { get; set; }

    [JsonPropertyName("totalReviewInboxOpen")]
    public int TotalReviewInboxOpen { get; set; }

    [JsonPropertyName("totalStuckProcessing")]
    public int TotalStuckProcessing { get; set; }

    [JsonPropertyName("dailyVolume")]
    public IReadOnlyList<SupportDailyProcessingVolumeDto> DailyVolume { get; set; } =
        Array.Empty<SupportDailyProcessingVolumeDto>();

    [JsonPropertyName("byFailureCategory")]
    public IReadOnlyList<SupportFailureCategoryBucketDto> ByFailureCategory { get; set; } =
        Array.Empty<SupportFailureCategoryBucketDto>();

    [JsonPropertyName("topFailureReasons")]
    public IReadOnlyList<SupportTopFailureReasonDto> TopFailureReasons { get; set; } =
        Array.Empty<SupportTopFailureReasonDto>();

    [JsonPropertyName("byDocumentType")]
    public IReadOnlyList<SupportDocumentTypeOutcomeDto> ByDocumentType { get; set; } =
        Array.Empty<SupportDocumentTypeOutcomeDto>();

    [JsonPropertyName("dailyFailuresByCategory")]
    public IReadOnlyList<SupportDailyFailureCategoryDto> DailyFailuresByCategory { get; set; } =
        Array.Empty<SupportDailyFailureCategoryDto>();

    [JsonPropertyName("qualityTrend")]
    public SupportQualityTrendDto QualityTrend { get; set; } = new();
}

public class SupportDailyProcessingVolumeDto
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = "";

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("succeeded")]
    public int Succeeded { get; set; }

    [JsonPropertyName("failed")]
    public int Failed { get; set; }
}

public class SupportFailureCategoryBucketDto
{
    [JsonPropertyName("category")]
    public string Category { get; set; } = "";

    [JsonPropertyName("label")]
    public string Label { get; set; } = "";

    [JsonPropertyName("description")]
    public string Description { get; set; } = "";

    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("shareOfFailures")]
    public double ShareOfFailures { get; set; }

    [JsonPropertyName("firstSeenAt")]
    public DateTimeOffset? FirstSeenAt { get; set; }

    [JsonPropertyName("lastSeenAt")]
    public DateTimeOffset? LastSeenAt { get; set; }
}

public class SupportTopFailureReasonDto
{
    [JsonPropertyName("reason")]
    public string Reason { get; set; } = "";

    [JsonPropertyName("category")]
    public string Category { get; set; } = "";

    [JsonPropertyName("count")]
    public int Count { get; set; }

    [JsonPropertyName("firstSeenAt")]
    public DateTimeOffset? FirstSeenAt { get; set; }

    [JsonPropertyName("lastSeenAt")]
    public DateTimeOffset? LastSeenAt { get; set; }
}

public class SupportDailyFailureCategoryDto
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = "";

    [JsonPropertyName("category")]
    public string Category { get; set; } = "";

    [JsonPropertyName("label")]
    public string Label { get; set; } = "";

    [JsonPropertyName("count")]
    public int Count { get; set; }
}

public class SupportQualityTrendDto
{
    [JsonPropertyName("previousFrom")]
    public DateTimeOffset PreviousFrom { get; set; }

    [JsonPropertyName("previousTo")]
    public DateTimeOffset PreviousTo { get; set; }

    [JsonPropertyName("previousSuccessRate")]
    public double PreviousSuccessRate { get; set; }

    [JsonPropertyName("successRateDelta")]
    public double SuccessRateDelta { get; set; }

    [JsonPropertyName("previousFailed")]
    public int PreviousFailed { get; set; }

    [JsonPropertyName("failedDelta")]
    public int FailedDelta { get; set; }
}

public class SupportDocumentTypeOutcomeDto
{
    [JsonPropertyName("documentType")]
    public string DocumentType { get; set; } = "";

    [JsonPropertyName("succeeded")]
    public int Succeeded { get; set; }

    [JsonPropertyName("failed")]
    public int Failed { get; set; }

    [JsonPropertyName("successRate")]
    public double SuccessRate { get; set; }
}

public class SupportVaultProcessingMetricsDto
{
    [JsonPropertyName("totalDocuments")]
    public int TotalDocuments { get; set; }

    [JsonPropertyName("clinicalSynced")]
    public int ClinicalSynced { get; set; }

    [JsonPropertyName("clinicalSyncErrors")]
    public int ClinicalSyncErrors { get; set; }

    [JsonPropertyName("pendingClinicalSync")]
    public int PendingClinicalSync { get; set; }

    [JsonPropertyName("byDocumentType")]
    public IReadOnlyList<SupportVaultDocumentTypeBucketDto> ByDocumentType { get; set; } =
        Array.Empty<SupportVaultDocumentTypeBucketDto>();
}

public class SupportVaultDocumentTypeBucketDto
{
    [JsonPropertyName("documentType")]
    public string DocumentType { get; set; } = "";

    [JsonPropertyName("count")]
    public int Count { get; set; }
}
