using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class SupportProcessedEmailsControllerTests
{
    private static readonly Guid EmailId = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");

    [Fact]
    public async Task GetById_WhenMissing_ReturnsNotFound()
    {
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock.Setup(s => s.GetByIdAsync(EmailId, It.IsAny<CancellationToken>())).ReturnsAsync((SupportProcessedEmailDetailDto?)null);
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.GetById(EmailId, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetById_WhenPresent_ReturnsOk()
    {
        var detail = new SupportProcessedEmailDetailDto
        {
            Id = EmailId,
            S3Key = "msg-1",
            Status = "completed",
            Success = false,
            FailureReason = "OCR failed",
        };
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock.Setup(s => s.GetByIdAsync(EmailId, It.IsAny<CancellationToken>())).ReturnsAsync(detail);
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.GetById(EmailId, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeSameAs(detail);
    }

    [Fact]
    public async Task ListAttachments_WhenRowMissing_ReturnsNotFound()
    {
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock.Setup(s => s.ListAttachmentsAsync(EmailId, It.IsAny<CancellationToken>())).ReturnsAsync((SupportProcessedEmailAttachmentsResponse?)null);
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.ListAttachments(EmailId, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task ListAttachments_WhenNotStored_ReturnsOkWithCode()
    {
        var body = new SupportProcessedEmailAttachmentsResponse
        {
            ErrorCode = SupportProcessedEmailsService.ErrorAttachmentNotStored,
            ErrorMessage = "not in storage",
        };
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock.Setup(s => s.ListAttachmentsAsync(EmailId, It.IsAny<CancellationToken>())).ReturnsAsync(body);
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.ListAttachments(EmailId, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeSameAs(body);
    }

    [Fact]
    public async Task SignedUrl_WhenRowMissing_ReturnsNotFound()
    {
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock.Setup(s => s.GetAttachmentSignedUrlAsync(EmailId, 0, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SupportProcessedEmailSignedUrlResponse?)null);
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.GetAttachmentSignedUrl(EmailId, 0, 120, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task SignedUrl_WhenInvalidIndex_ReturnsBadRequest()
    {
        var body = new SupportProcessedEmailSignedUrlResponse
        {
            ErrorCode = SupportProcessedEmailsService.ErrorInvalidIndex,
            ErrorMessage = "out of range",
        };
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock.Setup(s => s.GetAttachmentSignedUrlAsync(EmailId, 9, It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(body);
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.GetAttachmentSignedUrl(EmailId, 9, 120, CancellationToken.None);

        var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        bad.Value.Should().BeSameAs(body);
    }

    [Fact]
    public async Task SignedUrl_WhenNotStored_ReturnsOkWithBody()
    {
        var body = new SupportProcessedEmailSignedUrlResponse
        {
            ErrorCode = SupportProcessedEmailsService.ErrorAttachmentNotStored,
            SignedUrl = null,
        };
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock.Setup(s => s.GetAttachmentSignedUrlAsync(EmailId, 0, It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync(body);
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.GetAttachmentSignedUrl(EmailId, 0, 120, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeSameAs(body);
    }

    [Fact]
    public async Task List_CallsServiceWithQuery()
    {
        var expected = new SupportProcessedEmailsListResponse { TotalCount = 0, Page = 2, PageSize = 10 };
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock
            .Setup(s => s.ListAsync(It.IsAny<SupportProcessedEmailsListQuery>(), It.IsAny<CancellationToken>()))
            .Returns<SupportProcessedEmailsListQuery, CancellationToken>((q, _) =>
            {
                q.Page.Should().Be(2);
                q.PageSize.Should().Be(10);
                q.FailuresOnly.Should().BeFalse();
                q.Q.Should().Be("OCR");
                q.ReviewStatus.Should().Be("pending");
                return Task.FromResult(expected);
            });
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.List(
            page: 2,
            pageSize: 10,
            from: null,
            to: null,
            documentType: "all",
            reviewStatus: "pending",
            q: "OCR",
            failuresOnly: false,
            cancellationToken: CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeSameAs(expected);
    }

    [Fact]
    public async Task BulkClearReviewInbox_WhenDryRun_ReturnsOk()
    {
        var expected = new SupportBulkClearReviewInboxResponse
        {
            DryRun = true,
            Action = "dismiss",
            MatchingCount = 3,
            UpdatedCount = 0,
            Message = "Dry run",
        };
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock
            .Setup(s => s.BulkClearReviewInboxAsync(It.IsAny<SupportBulkClearReviewInboxRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.BulkClearReviewInbox(
            new SupportBulkClearReviewInboxRequest { DryRun = true },
            CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeSameAs(expected);
    }

    [Fact]
    public async Task BulkClearReviewInbox_WhenInvalidAction_ReturnsBadRequest()
    {
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock
            .Setup(s => s.BulkClearReviewInboxAsync(It.IsAny<SupportBulkClearReviewInboxRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException("action must be 'dismiss' or 'resolve'"));
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.BulkClearReviewInbox(
            new SupportBulkClearReviewInboxRequest { Action = "invalid", DryRun = false },
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task BulkReprocessReviewInbox_WhenDryRun_ReturnsOk()
    {
        var expected = new SupportBulkReprocessReviewInboxResponse
        {
            DryRun = true,
            EligibleCount = 5,
            Message = "Dry run",
        };
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock
            .Setup(s => s.BulkReprocessReviewInboxAsync(It.IsAny<SupportBulkReprocessReviewInboxRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.BulkReprocessReviewInbox(
            new SupportBulkReprocessReviewInboxRequest { DryRun = true },
            CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeSameAs(expected);
    }

    [Fact]
    public async Task ReleaseStuckLock_WhenMissing_ReturnsNotFound()
    {
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock.Setup(s => s.ReleaseStuckLockAsync(EmailId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((SupportReleaseStuckLockResponse?)null);
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.ReleaseStuckLock(EmailId, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task ReleaseStuckLock_WhenReleased_ReturnsOk()
    {
        var expected = new SupportReleaseStuckLockResponse
        {
            Released = true,
            Message = "released",
        };
        var mock = new Mock<ISupportProcessedEmailsService>();
        mock.Setup(s => s.ReleaseStuckLockAsync(EmailId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        var controller = new SupportProcessedEmailsController(mock.Object);

        var result = await controller.ReleaseStuckLock(EmailId, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeSameAs(expected);
    }
}
