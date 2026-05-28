using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class MiloDocumentsControllerTests
{
    private static readonly Guid UserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid PetId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    private static MiloDocumentsController CreateController(Mock<IMiloVisionService> vision, string bearer = "test-token")
    {
        var controller = new MiloDocumentsController(
            vision.Object,
            Options.Create(new MiloOptions()),
            NullLogger<MiloDocumentsController>.Instance);

        var claims = new List<Claim> { new("sub", UserId.ToString()) };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity),
            },
        };
        controller.Request.Headers.Authorization = $"Bearer {bearer}";
        return controller;
    }

    [Fact]
    public async Task Analyze_ReturnsOk_WhenVisionSucceeds()
    {
        var vision = new Mock<IMiloVisionService>();
        var expected = new PetDocumentVaultRowDto
        {
            Id = Guid.NewGuid(),
            PetId = PetId,
            UserId = UserId,
            StoragePath = "user/pet/doc.pdf",
            MimeType = "application/pdf",
            DocumentType = "vaccinations",
            Confidence = 0.95,
            ExtractedJson = "{}",
        };

        vision
            .Setup(v => v.AnalyzeAndPersistAsync(
                UserId,
                "test-token",
                It.IsAny<AnalyzePetDocumentRequest>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var controller = CreateController(vision);
        var result = await controller.Analyze(
            new AnalyzePetDocumentRequest { PetId = PetId, Path = expected.StoragePath },
            CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public async Task Analyze_ReturnsBadRequest_WhenPetIdMissing()
    {
        var vision = new Mock<IMiloVisionService>();
        var controller = CreateController(vision);

        var result = await controller.Analyze(
            new AnalyzePetDocumentRequest { PetId = Guid.Empty, Path = "x" },
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        vision.Verify(
            v => v.AnalyzeAndPersistAsync(
                It.IsAny<Guid>(),
                It.IsAny<string>(),
                It.IsAny<AnalyzePetDocumentRequest>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task AnalyzeInternal_ReturnsUnauthorized_WhenInternalKeyMismatch()
    {
        var vision = new Mock<IMiloVisionService>();
        var controller = new MiloDocumentsController(
            vision.Object,
            Options.Create(new MiloOptions { InternalServiceKey = "expected-key" }),
            NullLogger<MiloDocumentsController>.Instance);

        var result = await controller.AnalyzeInternal(
            "wrong-key",
            new AnalyzePetDocumentInternalRequest
            {
                PetId = PetId,
                UserId = UserId,
                Path = "user/pet/doc.pdf",
            },
            CancellationToken.None);

        result.Should().BeOfType<UnauthorizedResult>();
    }
}
