using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class SupportMiloQualityControllerTests
{
    [Fact]
    public async Task Overview_ReturnsOkAndCallsService()
    {
        var quality = new Mock<ISupportMiloQualityService>();
        var expected = new SupportMiloQualityOverviewResponse
        {
            Total = 10,
            SuccessCount = 8,
            FailedCount = 2,
            SuccessRate = 80,
        };
        quality.Setup(q => q.GetOverviewAsync(null, null, It.IsAny<CancellationToken>())).ReturnsAsync(expected);

        var controller = new SupportMiloQualityController(quality.Object);
        var result = await controller.Overview(cancellationToken: CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<SupportMiloQualityOverviewResponse>().Which.Total.Should().Be(10);
    }

    [Fact]
    public async Task Outcomes_WhenDbNotConfigured_Returns503()
    {
        var quality = new Mock<ISupportMiloQualityService>();
        quality
            .Setup(q => q.ListOutcomesAsync(
                null, null, null, null, null, null, null, 50, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Database not configured"));

        var controller = new SupportMiloQualityController(quality.Object);
        var result = await controller.Outcomes(cancellationToken: CancellationToken.None);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(503);
    }
}
