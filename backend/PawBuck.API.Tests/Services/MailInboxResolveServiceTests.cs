using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MailInboxResolveServiceTests
{
    [Fact]
    public void CanResolveProcessedEmail_AllowsLegacySuccessWithFailureReason()
    {
        Assert.True(
            MailInboxResolveService.CanResolveProcessedEmail(
                success: true,
                failureReason: "Failed to process 1 document(s): ...",
                reviewStatus: "pending"));
    }

    [Fact]
    public void CanResolveProcessedEmail_BlocksFullyResolved()
    {
        Assert.False(
            MailInboxResolveService.CanResolveProcessedEmail(
                success: true,
                failureReason: null,
                reviewStatus: "resolved"));
    }

    [Fact]
    public void CanResolveProcessedEmail_AllowsExplicitFailure()
    {
        Assert.True(
            MailInboxResolveService.CanResolveProcessedEmail(
                success: false,
                failureReason: "attachment_failures:1",
                reviewStatus: "pending"));
    }

    [Fact]
    public void CanResolveProcessedEmail_BlocksDismissed()
    {
        Assert.False(
            MailInboxResolveService.CanResolveProcessedEmail(
                success: false,
                failureReason: "x",
                reviewStatus: "dismissed"));
    }
}
