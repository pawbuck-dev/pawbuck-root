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
