using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class SupportProcessedEmailsBulkClearTests
{
    [Fact]
    public void BuildReviewInboxClearFilter_IncludesReviewInboxSemantics()
    {
        var (sql, parameters) = SupportProcessedEmailsService.BuildReviewInboxClearFilter(
            new SupportBulkClearReviewInboxRequest());

        Assert.Contains("pe.status = 'completed'", sql);
        Assert.Contains("COALESCE(pe.review_status", sql);
        Assert.Contains("pe.success = false OR NULLIF(trim(pe.failure_reason)", sql);
        Assert.Empty(parameters);
    }

    [Fact]
    public void BuildReviewInboxClearFilter_AddsOwnerAndDateFilters()
    {
        var ownerId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var emailId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        var from = DateTimeOffset.Parse("2026-05-01T00:00:00Z");
        var to = DateTimeOffset.Parse("2026-05-25T00:00:00Z");

        var (sql, parameters) = SupportProcessedEmailsService.BuildReviewInboxClearFilter(
            new SupportBulkClearReviewInboxRequest
            {
                OwnerUserId = ownerId,
                OwnerEmail = "owner@example.com",
                From = from,
                To = to,
                EmailIds = new[] { emailId },
            });

        Assert.Contains("p.user_id = @ownerUserId", sql);
        Assert.Contains("lower(u.email) = lower(@ownerEmail)", sql);
        Assert.Contains("pe.completed_at >= @from", sql);
        Assert.Contains("pe.completed_at < @to", sql);
        Assert.Contains("pe.id = ANY(@emailIds)", sql);
        Assert.Equal(5, parameters.Count);
    }
}
