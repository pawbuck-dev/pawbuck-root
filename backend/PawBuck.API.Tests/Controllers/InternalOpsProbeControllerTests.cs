using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using PawBuck.API.Configuration;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class InternalOpsProbeControllerTests
{
    [Fact]
    public async Task Ingest_InvalidKey_ReturnsUnauthorized()
    {
        var probes = new Mock<IOpsProbeService>();
        var controller = CreateController(probes.Object, ingestKey: "expected", miloKey: null);

        var result = await controller.Ingest("wrong", new OpsProbeIngestRequest { ProbeName = "api_health_external" }, default);

        result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task Ingest_ValidKey_RecordsProbe()
    {
        var probes = new Mock<IOpsProbeService>();
        probes
            .Setup(p => p.RecordProbeAsync(
                "api_health_external",
                "external_github",
                true,
                42,
                null,
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var controller = CreateController(probes.Object, ingestKey: "expected", miloKey: null);

        var result = await controller.Ingest(
            "expected",
            new OpsProbeIngestRequest
            {
                ProbeName = "api_health_external",
                Ok = true,
                LatencyMs = 42,
            },
            default);

        result.Should().BeOfType<NoContentResult>();
        probes.VerifyAll();
    }

    [Fact]
    public async Task Ingest_FallsBackToMiloInternalKey()
    {
        var probes = new Mock<IOpsProbeService>();
        probes
            .Setup(p => p.RecordProbeAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<int?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var controller = CreateController(probes.Object, ingestKey: null, miloKey: "milo-secret");

        var result = await controller.Ingest(
            "milo-secret",
            new OpsProbeIngestRequest { ProbeName = "api_health_external", Ok = true },
            default);

        result.Should().BeOfType<NoContentResult>();
    }

    private static InternalOpsProbeController CreateController(
        IOpsProbeService probes,
        string? ingestKey,
        string? miloKey)
    {
        return new InternalOpsProbeController(
            probes,
            Options.Create(new OpsProbeOptions { ExternalIngestKey = ingestKey }),
            Options.Create(new MiloOptions { InternalServiceKey = miloKey }),
            Mock.Of<Microsoft.Extensions.Logging.ILogger<InternalOpsProbeController>>());
    }
}
