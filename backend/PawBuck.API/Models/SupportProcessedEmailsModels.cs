using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

public class SupportProcessedEmailsListQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 25;
    public DateTimeOffset? From { get; set; }
    public DateTimeOffset? To { get; set; }
    /// <summary>Exact document_type value, or <c>all</c> / empty.</summary>
    public string? DocumentType { get; set; }
    /// <summary><c>pending</c>, <c>resolved</c>, <c>dismissed</c>, <c>all</c> / empty.</summary>
    public string? ReviewStatus { get; set; }
    public string? Q { get; set; }
    /// <summary>When true (default), only <c>success = false</c> rows.</summary>
    public bool FailuresOnly { get; set; } = true;

    /// <summary>
    /// When true, match rows visible in the consumer Messages → Processing errors list (plus stuck
    /// <c>status=processing</c> rows for support). Overrides <see cref="FailuresOnly"/>.
    /// </summary>
    public bool ReviewInboxOnly { get; set; }

    /// <summary>Filter by pet owner email (exact, case-insensitive).</summary>
    public string? OwnerEmail { get; set; }
}

public class SupportProcessedEmailListItemDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("s3Key")]
    public string S3Key { get; set; } = "";

    [JsonPropertyName("petId")]
    public Guid? PetId { get; set; }

    [JsonPropertyName("petName")]
    public string? PetName { get; set; }

    [JsonPropertyName("ownerEmail")]
    public string? OwnerEmail { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "";

    [JsonPropertyName("startedAt")]
    public DateTimeOffset? StartedAt { get; set; }

    [JsonPropertyName("completedAt")]
    public DateTimeOffset? CompletedAt { get; set; }

    [JsonPropertyName("attachmentCount")]
    public int? AttachmentCount { get; set; }

    [JsonPropertyName("success")]
    public bool? Success { get; set; }

    [JsonPropertyName("senderEmail")]
    public string? SenderEmail { get; set; }

    [JsonPropertyName("subject")]
    public string? Subject { get; set; }

    [JsonPropertyName("documentType")]
    public string? DocumentType { get; set; }

    [JsonPropertyName("failureReason")]
    public string? FailureReason { get; set; }

    [JsonPropertyName("failureReasonSnippet")]
    public string? FailureReasonSnippet { get; set; }

    [JsonPropertyName("reviewStatus")]
    public string? ReviewStatus { get; set; }
}

public class SupportProcessedEmailDetailDto : SupportProcessedEmailListItemDto
{
    /// <summary>Same rules as consumer <c>isReviewInboxCandidate</c> (requires status=completed).</summary>
    [JsonPropertyName("consumerInboxVisible")]
    public bool ConsumerInboxVisible { get; set; }

    [JsonPropertyName("consumerInboxHiddenReason")]
    public string? ConsumerInboxHiddenReason { get; set; }

    [JsonPropertyName("canOwnerResolve")]
    public bool CanOwnerResolve { get; set; }

    /// <summary>stored | missing | metadata_only | not_retained | storage_not_configured | invalid_json</summary>
    [JsonPropertyName("storedArchiveStatus")]
    public string? StoredArchiveStatus { get; set; }

    [JsonPropertyName("storedArchiveMessage")]
    public string? StoredArchiveMessage { get; set; }

    [JsonPropertyName("recommendedAction")]
    public string? RecommendedAction { get; set; }
}

public class SupportProcessedEmailsListResponse
{
    [JsonPropertyName("items")]
    public IReadOnlyList<SupportProcessedEmailListItemDto> Items { get; set; } = Array.Empty<SupportProcessedEmailListItemDto>();

    [JsonPropertyName("totalCount")]
    public int TotalCount { get; set; }

    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }
}

public class SupportProcessedEmailsSummaryBucketDto
{
    [JsonPropertyName("documentType")]
    public string DocumentType { get; set; } = "";

    [JsonPropertyName("count")]
    public int Count { get; set; }
}

public class SupportProcessedEmailsSummaryResponse
{
    [JsonPropertyName("from")]
    public DateTimeOffset From { get; set; }

    [JsonPropertyName("to")]
    public DateTimeOffset To { get; set; }

    [JsonPropertyName("totalFailures")]
    public int TotalFailures { get; set; }

    /// <summary>Rows matching consumer Review Inbox visibility (completed failures + legacy flagged).</summary>
    [JsonPropertyName("totalReviewInboxCandidates")]
    public int TotalReviewInboxCandidates { get; set; }

    [JsonPropertyName("totalStuckProcessing")]
    public int TotalStuckProcessing { get; set; }

    /// <summary><c>success=false</c> rows dismissed/resolved — hidden from consumer Processing errors.</summary>
    [JsonPropertyName("totalHardFailuresClearedFromInbox")]
    public int TotalHardFailuresClearedFromInbox { get; set; }

    [JsonPropertyName("byDocumentType")]
    public IReadOnlyList<SupportProcessedEmailsSummaryBucketDto> ByDocumentType { get; set; } =
        Array.Empty<SupportProcessedEmailsSummaryBucketDto>();
}

public class SupportProcessedEmailAttachmentDto
{
    [JsonPropertyName("index")]
    public int Index { get; set; }

    [JsonPropertyName("filename")]
    public string Filename { get; set; } = "";

    [JsonPropertyName("mimeType")]
    public string MimeType { get; set; } = "";

    [JsonPropertyName("size")]
    public long Size { get; set; }
}

public class SupportProcessedEmailAttachmentsResponse
{
    [JsonPropertyName("attachments")]
    public IReadOnlyList<SupportProcessedEmailAttachmentDto> Attachments { get; set; } =
        Array.Empty<SupportProcessedEmailAttachmentDto>();

    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }

    /// <summary>Non-fatal hint (e.g. bodies omitted in Edge archive JSON).</summary>
    [JsonPropertyName("warningMessage")]
    public string? WarningMessage { get; set; }
}

public class SupportProcessedEmailSignedUrlResponse
{
    [JsonPropertyName("signedUrl")]
    public string? SignedUrl { get; set; }

    [JsonPropertyName("filename")]
    public string? Filename { get; set; }

    [JsonPropertyName("mimeType")]
    public string? MimeType { get; set; }

    [JsonPropertyName("previewPath")]
    public string? PreviewPath { get; set; }

    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }
}

public class SupportBulkClearReviewInboxRequest
{
    /// <summary><c>dismiss</c> (default) or <c>resolve</c>.</summary>
    [JsonPropertyName("action")]
    public string Action { get; set; } = "dismiss";

    /// <summary>When true (default), returns matching count without updating rows.</summary>
    [JsonPropertyName("dryRun")]
    public bool DryRun { get; set; } = true;

    [JsonPropertyName("ownerUserId")]
    public Guid? OwnerUserId { get; set; }

    [JsonPropertyName("ownerEmail")]
    public string? OwnerEmail { get; set; }

    [JsonPropertyName("from")]
    public DateTimeOffset? From { get; set; }

    [JsonPropertyName("to")]
    public DateTimeOffset? To { get; set; }

    [JsonPropertyName("emailIds")]
    public IReadOnlyList<Guid>? EmailIds { get; set; }

    /// <summary>Max rows to update per call (1–5000, default 500).</summary>
    [JsonPropertyName("maxRows")]
    public int MaxRows { get; set; } = 500;
}

public class SupportBulkClearReviewInboxResponse
{
    [JsonPropertyName("dryRun")]
    public bool DryRun { get; set; }

    [JsonPropertyName("action")]
    public string Action { get; set; } = "";

    [JsonPropertyName("matchingCount")]
    public int MatchingCount { get; set; }

    [JsonPropertyName("updatedCount")]
    public int UpdatedCount { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = "";
}

/// <summary>
/// Remove false-success inbound mail rows (message stored, zero attachments filed).
/// </summary>
public class SupportBulkDeleteGhostSuccessRequest
{
    [JsonPropertyName("dryRun")]
    public bool DryRun { get; set; } = true;

    [JsonPropertyName("ownerUserId")]
    public Guid? OwnerUserId { get; set; }

    [JsonPropertyName("ownerEmail")]
    public string? OwnerEmail { get; set; }

    [JsonPropertyName("petId")]
    public Guid? PetId { get; set; }

    [JsonPropertyName("petName")]
    public string? PetName { get; set; }

    [JsonPropertyName("from")]
    public DateTimeOffset? From { get; set; }

    [JsonPropertyName("to")]
    public DateTimeOffset? To { get; set; }

    [JsonPropertyName("emailIds")]
    public IReadOnlyList<Guid>? EmailIds { get; set; }

    /// <summary>Max rows to delete per call (1–5000, default 500).</summary>
    [JsonPropertyName("maxRows")]
    public int MaxRows { get; set; } = 500;
}

public class SupportBulkDeleteGhostSuccessResponse
{
    [JsonPropertyName("dryRun")]
    public bool DryRun { get; set; }

    [JsonPropertyName("matchingCount")]
    public int MatchingCount { get; set; }

    [JsonPropertyName("deletedCount")]
    public int DeletedCount { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = "";
}

public class SupportBulkReprocessReviewInboxRequest
{
    [JsonPropertyName("dryRun")]
    public bool DryRun { get; set; } = true;

    /// <summary>Used when a row has no mappable <c>document_type</c> (default vaccinations).</summary>
    [JsonPropertyName("defaultDocType")]
    public string DefaultDocType { get; set; } = "vaccinations";

    /// <summary>Include rows already dismissed from the consumer Review Inbox.</summary>
    [JsonPropertyName("includeDismissed")]
    public bool IncludeDismissed { get; set; } = true;

    [JsonPropertyName("ownerUserId")]
    public Guid? OwnerUserId { get; set; }

    [JsonPropertyName("ownerEmail")]
    public string? OwnerEmail { get; set; }

    [JsonPropertyName("from")]
    public DateTimeOffset? From { get; set; }

    [JsonPropertyName("to")]
    public DateTimeOffset? To { get; set; }

    [JsonPropertyName("emailIds")]
    public IReadOnlyList<Guid>? EmailIds { get; set; }

    /// <summary>Max rows to reprocess per call (1–50, default 10).</summary>
    [JsonPropertyName("maxRows")]
    public int MaxRows { get; set; } = 10;
}

public class SupportBulkReprocessRowResultDto
{
    [JsonPropertyName("emailId")]
    public Guid EmailId { get; set; }

    [JsonPropertyName("subject")]
    public string? Subject { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "";

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

public class SupportBulkReprocessReviewInboxResponse
{
    [JsonPropertyName("dryRun")]
    public bool DryRun { get; set; }

    [JsonPropertyName("eligibleCount")]
    public int EligibleCount { get; set; }

    [JsonPropertyName("attemptedCount")]
    public int AttemptedCount { get; set; }

    [JsonPropertyName("succeededCount")]
    public int SucceededCount { get; set; }

    [JsonPropertyName("failedCount")]
    public int FailedCount { get; set; }

    [JsonPropertyName("skippedCount")]
    public int SkippedCount { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = "";

    [JsonPropertyName("results")]
    public IReadOnlyList<SupportBulkReprocessRowResultDto> Results { get; set; } =
        Array.Empty<SupportBulkReprocessRowResultDto>();
}
