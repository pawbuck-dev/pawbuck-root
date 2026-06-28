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
    public void BuildListFilter_StuckOnly_filters_processing_status()
    {
        var (sql, _) = SupportProcessedEmailsService.BuildListFilter(
            new SupportProcessedEmailsListQuery { StuckOnly = true });

        Assert.Contains("pe.status = 'processing'", sql);
        Assert.DoesNotContain("review_status", sql, StringComparison.Ordinal);
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

    [Fact]
    public void IsSuccessfulCompletionWithoutFailure_true_when_completed_success_no_failure_reason()
    {
        Assert.True(SupportProcessedEmailsService.IsSuccessfulCompletionWithoutFailure(
            new SupportProcessedEmailDetailDto
            {
                Status = "completed",
                Success = true,
                FailureReason = null,
            }));
    }

    [Fact]
    public void BuildRecommendedAction_SuccessWithoutArchive_not_retained_not_cannot_reprocess()
    {
        var action = SupportProcessedEmailsService.BuildRecommendedAction(new SupportProcessedEmailDetailDto
        {
            Status = "completed",
            Success = true,
            ReviewStatus = "resolved",
            StoredArchiveStatus = "not_retained",
            AttachmentCount = 2,
            DocumentType = "vaccinations",
        });

        Assert.DoesNotContain("Cannot reprocess", action, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Verify health records", action, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void BuildRecommendedAction_GhostSuccess_suggests_resend()
    {
        var action = SupportProcessedEmailsService.BuildRecommendedAction(new SupportProcessedEmailDetailDto
        {
            Status = "completed",
            Success = true,
            ReviewStatus = "resolved",
            StoredArchiveStatus = "not_retained",
            AttachmentCount = 0,
        });

        Assert.Contains("false-success", action, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("re-send", action, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void BuildRecommendedAction_AnalyzeInternalNotConfigured_PointsAtApiEcsKey()
    {
        var action = SupportProcessedEmailsService.BuildRecommendedAction(new SupportProcessedEmailDetailDto
        {
            Status = "completed",
            StoredArchiveStatus = "stored",
            CanOwnerResolve = true,
            ConsumerInboxVisible = true,
            FailureReason = """Failed to process 1 document(s): {"error":"analyze-internal not configured"}""",
        });

        Assert.Contains("Milo__InternalServiceKey", action, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("miloAnalyzeInternalConfigured", action, StringComparison.OrdinalIgnoreCase);
    }
}
