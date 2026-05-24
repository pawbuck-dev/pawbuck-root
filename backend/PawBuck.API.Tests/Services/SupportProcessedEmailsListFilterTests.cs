using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class SupportProcessedEmailsListFilterTests
{
    [Fact]
    public void BuildListFilter_ReviewInboxOnly_IncludesLegacySuccessWithFailureReason()
    {
        var (sql, _) = SupportProcessedEmailsService.BuildListFilter(
            new SupportProcessedEmailsListQuery { ReviewInboxOnly = true });

        Assert.Contains("pe.success = false OR NULLIF(trim(pe.failure_reason), '') IS NOT NULL", sql);
        Assert.Contains("pe.status = 'processing'", sql);
        Assert.Contains("pe.status = 'completed'", sql);
    }

    [Fact]
    public void BuildListFilter_FailuresOnly_RequiresSuccessFalse()
    {
        var (sql, _) = SupportProcessedEmailsService.BuildListFilter(
            new SupportProcessedEmailsListQuery { FailuresOnly = true });

        Assert.Contains("pe.success = false", sql);
        Assert.Contains("pe.status = 'completed'", sql);
    }

    [Fact]
    public void GetConsumerInboxVisibility_MatchesConsumerAppRules()
    {
        var (visible, _) = SupportProcessedEmailsService.GetConsumerInboxVisibility(
            "completed", true, "Failed to process 1 document(s)", "pending");
        Assert.True(visible);

        var (hidden, reason) = SupportProcessedEmailsService.GetConsumerInboxVisibility(
            "processing", null, null, "pending");
        Assert.False(hidden);
        Assert.Contains("processing", reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void BuildRecommendedAction_FlagsMissingArchive()
    {
        var action = SupportProcessedEmailsService.BuildRecommendedAction(new SupportProcessedEmailDetailDto
        {
            Status = "completed",
            StoredArchiveStatus = "missing",
            CanOwnerResolve = true,
            ConsumerInboxVisible = true,
        });

        Assert.Contains("Cannot reprocess", action, StringComparison.OrdinalIgnoreCase);
    }
}
