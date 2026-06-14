using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class SupportOpsControllerTests
{
    [Fact]
    public async Task GetOpsHealth_ReturnsOkWithChecks()
    {
        var probes = new Mock<IOpsProbeService>();
        probes
            .Setup(p => p.GetLiveHealthAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SupportOpsHealthResponse
            {
                AllReady = true,
                Checks =
                [
                    new SupportOpsHealthCheckDto { Id = "gemini", Label = "Gemini", Ok = true, Hint = "ok" },
                ],
                CheckedAt = DateTimeOffset.UtcNow,
                PostgresLatencyMs = 12,
            });

        var controller = new SupportOpsController(probes.Object);

        var result = await controller.GetOpsHealth(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<SupportOpsHealthResponse>().Subject;
        body.AllReady.Should().BeTrue();
        body.Checks.Should().NotBeEmpty();
        body.PostgresLatencyMs.Should().Be(12);
    }
}
