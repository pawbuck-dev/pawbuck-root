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
}
