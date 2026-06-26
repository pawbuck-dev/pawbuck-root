using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

public static class MiloInteractionSurfaces
{
    public const string Chat = "chat";
    public const string Journal = "journal";
    public const string Vision = "vision";
    public const string EmailVault = "email_vault";
}

public static class MiloInteractionOutcomes
{
    public const string Success = "success";
    public const string Partial = "partial";
    public const string Failed = "failed";
}

public static class MiloInteractionFailureCodes
{
    public const string AccessDenied = "access_denied";
    public const string ApiNotConfigured = "api_not_configured";
    public const string EmptyAnswer = "empty_answer";
    public const string UnhandledException = "unhandled_exception";
    public const string JournalEmergencyStop = "journal_emergency_stop";
    public const string VisionLowConfidence = "vision_low_confidence";
    public const string VisionEmptyItems = "vision_empty_items";
    public const string VisionWrongType = "vision_wrong_type";
    public const string VisionClassifyLowConfidence = "vision_classify_low_confidence";
}

public sealed class MiloInteractionOutcomeInsert
{
    public Guid? UserId { get; init; }
    public Guid? PetId { get; init; }
    public Guid? TurnId { get; init; }
    public Guid? DocumentId { get; init; }
    public string Surface { get; init; } = "";
    public string Outcome { get; init; } = "";
    public string? FailureCode { get; init; }
    public IReadOnlyList<string> IntentTags { get; init; } = Array.Empty<string>();
    public bool UsedRag { get; init; }
    public bool UsedCurated { get; init; }
    public bool UsedPetFacts { get; init; }
    public bool JournalEmergencyStop { get; init; }
    public string? DocumentType { get; init; }
    public double? Confidence { get; init; }
    public string? ModelId { get; init; }
    public IReadOnlyDictionary<string, object?>? Metadata { get; init; }
}

public sealed class SupportMiloQualityOverviewResponse
{
    [JsonPropertyName("from")]
    public DateTimeOffset From { get; init; }

    [JsonPropertyName("to")]
    public DateTimeOffset To { get; init; }

    [JsonPropertyName("total")]
    public int Total { get; init; }

    [JsonPropertyName("successCount")]
    public int SuccessCount { get; init; }

    [JsonPropertyName("partialCount")]
    public int PartialCount { get; init; }

    [JsonPropertyName("failedCount")]
    public int FailedCount { get; init; }

    [JsonPropertyName("successRate")]
    public double SuccessRate { get; init; }

    [JsonPropertyName("bySurface")]
    public IReadOnlyList<SupportMiloQualityBucketRow> BySurface { get; init; } = Array.Empty<SupportMiloQualityBucketRow>();

    [JsonPropertyName("topFailureCodes")]
    public IReadOnlyList<SupportMiloQualityBucketRow> TopFailureCodes { get; init; } = Array.Empty<SupportMiloQualityBucketRow>();
}

public sealed class SupportMiloQualityBucketRow
{
    [JsonPropertyName("key")]
    public string Key { get; init; } = "";

    [JsonPropertyName("count")]
    public int Count { get; init; }
}

public sealed class SupportMiloQualityOutcomesResponse
{
    [JsonPropertyName("from")]
    public DateTimeOffset From { get; init; }

    [JsonPropertyName("to")]
    public DateTimeOffset To { get; init; }

    [JsonPropertyName("total")]
    public int Total { get; init; }

    [JsonPropertyName("items")]
    public IReadOnlyList<SupportMiloQualityOutcomeRow> Items { get; init; } = Array.Empty<SupportMiloQualityOutcomeRow>();
}

public sealed class SupportMiloQualityOutcomeRow
{
    [JsonPropertyName("id")]
    public Guid Id { get; init; }

    [JsonPropertyName("createdAt")]
    public DateTimeOffset CreatedAt { get; init; }

    [JsonPropertyName("userId")]
    public Guid? UserId { get; init; }

    [JsonPropertyName("petId")]
    public Guid? PetId { get; init; }

    [JsonPropertyName("turnId")]
    public Guid? TurnId { get; init; }

    [JsonPropertyName("documentId")]
    public Guid? DocumentId { get; init; }

    [JsonPropertyName("surface")]
    public string Surface { get; init; } = "";

    [JsonPropertyName("outcome")]
    public string Outcome { get; init; } = "";

    [JsonPropertyName("failureCode")]
    public string? FailureCode { get; init; }

    [JsonPropertyName("intentTags")]
    public IReadOnlyList<string> IntentTags { get; init; } = Array.Empty<string>();

    [JsonPropertyName("usedRag")]
    public bool UsedRag { get; init; }

    [JsonPropertyName("usedCurated")]
    public bool UsedCurated { get; init; }

    [JsonPropertyName("usedPetFacts")]
    public bool UsedPetFacts { get; init; }

    [JsonPropertyName("journalEmergencyStop")]
    public bool JournalEmergencyStop { get; init; }

    [JsonPropertyName("documentType")]
    public string? DocumentType { get; init; }

    [JsonPropertyName("confidence")]
    public double? Confidence { get; init; }

    [JsonPropertyName("modelId")]
    public string? ModelId { get; init; }
}
