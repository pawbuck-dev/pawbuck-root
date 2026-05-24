namespace PawBuck.API.Services;

public interface IMailgunEdgeReprocessService
{
    /// <summary>Re-invoke <c>mailgun-process-pet-mail</c> for a stored inbound email JSON.</summary>
    Task<MailgunEdgeReprocessResult> ReprocessStoredEmailAsync(
        string s3Key,
        Guid petId,
        string documentType,
        CancellationToken cancellationToken = default);

    /// <summary>Reset a completed row so the edge function can run attachment processing again.</summary>
    Task ReopenProcessedEmailRowAsync(Guid processedEmailId, CancellationToken cancellationToken = default);

    /// <summary>Mark a Review Inbox row resolved after successful reprocessing.</summary>
    Task MarkReviewInboxResolvedAsync(Guid processedEmailId, Guid petId, CancellationToken cancellationToken = default);

    MailgunEdgeParseOutcome ParseEdgeResponse(string responseBody);

    /// <summary>Map <c>processed_emails.document_type</c> (or default) to a pipeline doc type.</summary>
    string? MapPipelineDocumentType(string? storedDocumentType, string? defaultDocumentType);
}

public sealed class MailgunEdgeReprocessResult
{
    public bool HttpOk { get; init; }
    public MailgunEdgeParseOutcome Outcome { get; init; } = new(false, false, null);
    public string? RawBody { get; init; }
}

public sealed record MailgunEdgeParseOutcome(bool Reprocessed, bool RecordsInserted, string? Message);
