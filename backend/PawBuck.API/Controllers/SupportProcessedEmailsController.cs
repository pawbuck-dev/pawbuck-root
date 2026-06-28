using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/processed-emails")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportProcessedEmailsController : ControllerBase
{
    private readonly ISupportProcessedEmailsService _processedEmails;

    public SupportProcessedEmailsController(ISupportProcessedEmailsService processedEmails)
    {
        _processedEmails = processedEmails;
    }

    /// <summary>Paged list of processed inbound emails (defaults to completed failures only).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(SupportProcessedEmailsListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        [FromQuery] string? documentType = null,
        [FromQuery] string? reviewStatus = null,
        [FromQuery] string? q = null,
        [FromQuery] bool failuresOnly = true,
        [FromQuery] bool reviewInboxOnly = false,
        [FromQuery] bool stuckOnly = false,
        [FromQuery] string? ownerEmail = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = new SupportProcessedEmailsListQuery
            {
                Page = page,
                PageSize = pageSize,
                From = from,
                To = to,
                DocumentType = documentType,
                ReviewStatus = reviewStatus,
                Q = q,
                FailuresOnly = failuresOnly,
                ReviewInboxOnly = reviewInboxOnly,
                StuckOnly = stuckOnly,
                OwnerEmail = ownerEmail,
            };
            var result = await _processedEmails.ListAsync(query, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    /// <summary>Failure counts grouped by document type (defaults to last 30 days).</summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(SupportProcessedEmailsSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Summary(
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _processedEmails.GetSummaryAsync(from, to, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Bulk dismiss or resolve consumer Review Inbox rows still shown under Processing errors.
    /// Defaults to <c>dryRun=true</c>; set <c>dryRun=false</c> to apply.
    /// </summary>
    [HttpPost("bulk-clear-review-inbox")]
    [ProducesResponseType(typeof(SupportBulkClearReviewInboxResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> BulkClearReviewInbox(
        [FromBody] SupportBulkClearReviewInboxRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            return BadRequest(new { error = "Request body is required" });

        try
        {
            var result = await _processedEmails.BulkClearReviewInboxAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Delete false-success processed_emails (message-only ingest, zero attachments filed).
    /// Defaults to <c>dryRun=true</c>.
    /// </summary>
    [HttpPost("bulk-delete-ghost-success")]
    [ProducesResponseType(typeof(SupportBulkDeleteGhostSuccessResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> BulkDeleteGhostSuccess(
        [FromBody] SupportBulkDeleteGhostSuccessRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            return BadRequest(new { error = "Request body is required" });

        try
        {
            var result = await _processedEmails.BulkDeleteGhostSuccessAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Re-run mailgun attachment processing for Review Inbox failures (files health records + marks resolved).
    /// Defaults to <c>dryRun=true</c>.
    /// </summary>
    [HttpPost("bulk-reprocess-review-inbox")]
    [ProducesResponseType(typeof(SupportBulkReprocessReviewInboxResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> BulkReprocessReviewInbox(
        [FromBody] SupportBulkReprocessReviewInboxRequest? request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            return BadRequest(new { error = "Request body is required" });

        try
        {
            var result = await _processedEmails.BulkReprocessReviewInboxAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SupportProcessedEmailDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var row = await _processedEmails.GetByIdAsync(id, cancellationToken);
            if (row is null)
                return NotFound();
            return Ok(row);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    [HttpGet("{id:guid}/attachments")]
    [ProducesResponseType(typeof(SupportProcessedEmailAttachmentsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> ListAttachments(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _processedEmails.ListAttachmentsAsync(id, cancellationToken);
            if (result is null)
                return NotFound();
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    [HttpGet("{id:guid}/attachments/{index:int}/signed-url")]
    [ProducesResponseType(typeof(SupportProcessedEmailSignedUrlResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetAttachmentSignedUrl(
        Guid id,
        int index,
        [FromQuery] int ttlSeconds = 300,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _processedEmails.GetAttachmentSignedUrlAsync(id, index, ttlSeconds, cancellationToken);
            if (result is null)
                return NotFound();
            if (result.ErrorCode == SupportProcessedEmailsService.ErrorInvalidIndex)
                return BadRequest(result);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    /// <summary>Release a stuck <c>status=processing</c> lock on a processed email row.</summary>
    [HttpPost("{id:guid}/release-stuck-lock")]
    [ProducesResponseType(typeof(SupportReleaseStuckLockResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> ReleaseStuckLock(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _processedEmails.ReleaseStuckLockAsync(id, cancellationToken);
            if (result is null)
                return NotFound();
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }
}
