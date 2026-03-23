using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class DocumentControllerTests
{
    private readonly Mock<IDocumentClassifier> _classifierMock;
    private readonly Mock<IMiloPromptProvider> _promptProviderMock;
    private readonly ClassificationService _classificationService;
    private readonly DocumentController _controller;

    public DocumentControllerTests()
    {
        _classifierMock = new Mock<IDocumentClassifier>();
        _promptProviderMock = new Mock<IMiloPromptProvider>();
        var serviceLoggerMock = new Mock<ILogger<ClassificationService>>();
        var controllerLoggerMock = new Mock<ILogger<DocumentController>>();

        _classificationService = new ClassificationService(
            _classifierMock.Object,
            _promptProviderMock.Object,
            serviceLoggerMock.Object);

        _controller = new DocumentController(_classificationService, controllerLoggerMock.Object);
    }

    [Fact]
    public async Task Classify_WhenImageUrlProvided_ReturnsOkWithClassifyResponse()
    {
        var request = new ClassifyRequest { ImageUrl = "https://example.com/doc.jpg" };

        _classifierMock
            .Setup(c => c.ClassifyAsync(request.ImageUrl!, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DocumentClassificationResult
            {
                Type = "Vaccine",
                Confidence = 90,
                Reasoning = "Vaccination record."
            });

        _promptProviderMock
            .Setup(p => p.GetPromptForType("Vaccine"))
            .Returns("Milo prompt...");

        var result = await _controller.Classify(request, CancellationToken.None);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ClassifyResponse>().Subject;
        response.DocumentType.Should().Be("Vaccine");
        response.Confidence.Should().Be(90);
        response.ExtractionPrompt.Should().Be("Milo prompt...");
    }

    [Fact]
    public async Task Classify_WhenImageUrlIsNull_ReturnsBadRequest()
    {
        var request = new ClassifyRequest { ImageUrl = null };

        var result = await _controller.Classify(request!, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Classify_WhenImageUrlIsEmpty_ReturnsBadRequest()
    {
        var request = new ClassifyRequest { ImageUrl = "   " };

        var result = await _controller.Classify(request, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }
}
