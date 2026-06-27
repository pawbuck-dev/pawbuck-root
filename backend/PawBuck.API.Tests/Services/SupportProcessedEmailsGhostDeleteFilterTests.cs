using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class SupportProcessedEmailsGhostDeleteFilterTests
{
    [Fact]
    public void BuildGhostSuccessDeleteFilter_MatchesFalseSuccessPattern()
    {
        var (sql, _) = SupportProcessedEmailsService.BuildGhostSuccessDeleteFilter(
            new SupportBulkDeleteGhostSuccessRequest());

        Assert.Contains("pe.success = TRUE", sql);
        Assert.Contains("review_status", sql);
        Assert.Contains("document_type", sql);
        Assert.Contains("attachment_count", sql);
        Assert.Contains("failure_reason", sql);
    }

    [Fact]
    public void BuildGhostSuccessDeleteFilter_ScopesByPetName()
    {
        var (sql, parameters) = SupportProcessedEmailsService.BuildGhostSuccessDeleteFilter(
            new SupportBulkDeleteGhostSuccessRequest { PetName = "Milo" });

        Assert.Contains("p.name ILIKE @petName", sql);
        Assert.Contains(("petName", "Milo"), parameters);
    }

    [Fact]
    public void BuildGhostSuccessDeleteFilter_ScopesByEmailIds()
    {
        var id = Guid.Parse("75b5d6ab-76fb-414e-9729-f0538e72540d");
        var (sql, parameters) = SupportProcessedEmailsService.BuildGhostSuccessDeleteFilter(
            new SupportBulkDeleteGhostSuccessRequest { EmailIds = new[] { id } });

        Assert.Contains("pe.id = ANY(@emailIds)", sql);
        Assert.Contains(parameters, p => p.Name == "emailIds");
    }
}
