using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface ISupportProcessedEmailsService
{
    Task<SupportProcessedEmailsListResponse> ListAsync(
        SupportProcessedEmailsListQuery query,
        CancellationToken cancellationToken = default);

    Task<SupportProcessedEmailDetailDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<SupportProcessedEmailsSummaryResponse> GetSummaryAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// <c>null</c> when no <c>processed_emails</c> row exists for <paramref name="processedEmailId"/>.
    /// </summary>
    Task<SupportProcessedEmailAttachmentsResponse?> ListAttachmentsAsync(
        Guid processedEmailId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// <c>null</c> when no <c>processed_emails</c> row exists for <paramref name="processedEmailId"/>.
    /// </summary>
    Task<SupportProcessedEmailSignedUrlResponse?> GetAttachmentSignedUrlAsync(
        Guid processedEmailId,
        int index,
        int ttlSeconds,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Bulk dismiss or resolve Review Inbox rows (<c>processed_emails</c> still shown in consumer Messages).
    /// </summary>
    Task<SupportBulkClearReviewInboxResponse> BulkClearReviewInboxAsync(
        SupportBulkClearReviewInboxRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Re-run mailgun attachment processing for Review Inbox rows and file health records.
    /// </summary>
    Task<SupportBulkReprocessReviewInboxResponse> BulkReprocessReviewInboxAsync(
        SupportBulkReprocessReviewInboxRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete false-success <c>processed_emails</c> rows (resolved, no document filed, zero attachments).
    /// </summary>
    Task<SupportBulkDeleteGhostSuccessResponse> BulkDeleteGhostSuccessAsync(
        SupportBulkDeleteGhostSuccessRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Release a stuck <c>status=processing</c> lock so the row can be reprocessed or dismissed.
    /// Returns <c>null</c> when no row exists.
    /// </summary>
    Task<SupportReleaseStuckLockResponse?> ReleaseStuckLockAsync(
        Guid processedEmailId,
        CancellationToken cancellationToken = default);
}
