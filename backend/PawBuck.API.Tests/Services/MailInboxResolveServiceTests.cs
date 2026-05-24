using Microsoft.Extensions.Logging.Abstractions;
using PawBuck.API.Models;
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

    [Fact]
    public void ParseEdgeResponse_RejectsAlreadyProcessedSkip()
    {
        var svc = new MailgunEdgeReprocessService(
            Microsoft.Extensions.Options.Options.Create(new SupabaseOptions()),
            new MockHttpClientFactory(),
            NullLogger<MailgunEdgeReprocessService>.Instance);
        var outcome = svc.ParseEdgeResponse("""
            {"success":true,"message":"Email already processed","status":"completed"}
            """);

        Assert.False(outcome.Reprocessed);
        Assert.False(outcome.RecordsInserted);
    }

    [Fact]
    public void ParseEdgeResponse_AcceptsInsertedAttachment()
    {
        var svc = new MailgunEdgeReprocessService(
            Microsoft.Extensions.Options.Options.Create(new SupabaseOptions()),
            new MockHttpClientFactory(),
            NullLogger<MailgunEdgeReprocessService>.Instance);
        var outcome = svc.ParseEdgeResponse("""
            {"success":true,"processedAttachments":[{"dbInserted":true}]}
            """);

        Assert.True(outcome.Reprocessed);
        Assert.True(outcome.RecordsInserted);
    }

    [Fact]
    public void ParseEdgeResponse_RejectsFailedAttachments()
    {
        var svc = new MailgunEdgeReprocessService(
            Microsoft.Extensions.Options.Options.Create(new SupabaseOptions()),
            new MockHttpClientFactory(),
            NullLogger<MailgunEdgeReprocessService>.Instance);
        var outcome = svc.ParseEdgeResponse("""
            {"success":true,"processedAttachments":[{"dbInserted":false}]}
            """);

        Assert.True(outcome.Reprocessed);
        Assert.False(outcome.RecordsInserted);
    }

    [Fact]
    public void MapPipelineDocumentType_MapsVaccinationAndTravelCertificate()
    {
        var svc = new MailgunEdgeReprocessService(
            Microsoft.Extensions.Options.Options.Create(new SupabaseOptions()),
            new MockHttpClientFactory(),
            NullLogger<MailgunEdgeReprocessService>.Instance);
        Assert.Equal("vaccinations", svc.MapPipelineDocumentType("vaccination", null));
        Assert.Equal("clinical_exams", svc.MapPipelineDocumentType("travel_certificate", null));
        Assert.Equal("vaccinations", svc.MapPipelineDocumentType(null, "vaccinations"));
    }
}

internal sealed class MockHttpClientFactory : IHttpClientFactory
{
    public HttpClient CreateClient(string name) => new HttpClient();
}
