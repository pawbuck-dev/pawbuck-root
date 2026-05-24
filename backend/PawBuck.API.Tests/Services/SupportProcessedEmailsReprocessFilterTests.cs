using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class SupportProcessedEmailsReprocessFilterTests
{
    [Fact]
    public void BuildReviewInboxReprocessFilter_IncludesDismissedByDefault()
    {
        var (sql, parameters) = SupportProcessedEmailsService.BuildReviewInboxReprocessFilter(
            new SupportBulkReprocessReviewInboxRequest());

        Assert.Contains("pe.pet_id IS NOT NULL", sql);
        Assert.Contains("pe.s3_key IS NOT NULL", sql);
        Assert.DoesNotContain("dismissed", sql);
        Assert.Empty(parameters);
    }

    [Fact]
    public void BuildReviewInboxReprocessFilter_ExcludesDismissedWhenRequested()
    {
        var (sql, _) = SupportProcessedEmailsService.BuildReviewInboxReprocessFilter(
            new SupportBulkReprocessReviewInboxRequest { IncludeDismissed = false });

        Assert.Contains("NOT IN ('dismissed', 'resolved')", sql);
    }
}
