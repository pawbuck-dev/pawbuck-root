using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class SupportMiloClassifyControllerTests
{
    private readonly Mock<IDocumentClassifier> _classifierMock;
    private readonly Mock<IMiloPromptProvider> _promptProviderMock;
    private readonly Mock<IMiloVisionService> _miloVisionMock;
    private readonly ClassificationService _classificationService;
    private readonly SupportMiloClassifyController _controller;

    public SupportMiloClassifyControllerTests()
    {
        _classifierMock = new Mock<IDocumentClassifier>();
        _promptProviderMock = new Mock<IMiloPromptProvider>();
        _miloVisionMock = new Mock<IMiloVisionService>();
        var serviceLoggerMock = new Mock<ILogger<ClassificationService>>();
        var controllerLoggerMock = new Mock<ILogger<SupportMiloClassifyController>>();

        _classificationService = new ClassificationService(
            _classifierMock.Object,
            _promptProviderMock.Object,
            serviceLoggerMock.Object);

        _controller = new SupportMiloClassifyController(
            _classificationService,
            _miloVisionMock.Object,
            _promptProviderMock.Object,
            controllerLoggerMock.Object);
    }

    [Fact]
    public async Task ClassifyPreview_WhenRequestNull_ReturnsBadRequest()
    {
        var result = await _controller.ClassifyPreview(null, CancellationToken.None);
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ClassifyPreview_WhenFileBase64Missing_ReturnsBadRequest()
    {
        var result = await _controller.ClassifyPreview(new ClassifyPreviewRequest { FileBase64 = "  " }, CancellationToken.None);
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ClassifyPreview_WhenBase64Invalid_ReturnsBadRequest()
    {
        var result = await _controller.ClassifyPreview(
            new ClassifyPreviewRequest { FileBase64 = "!!!not-base64!!!" },
            CancellationToken.None);
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ClassifyPreview_WhenDecodedEmpty_ReturnsBadRequest()
    {
        var result = await _controller.ClassifyPreview(
            new ClassifyPreviewRequest { FileBase64 = Convert.ToBase64String(Array.Empty<byte>()) },
            CancellationToken.None);
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ClassifyPreview_WhenDecodedExceedsMax_ReturnsBadRequest()
    {
        var oversized = new byte[SupportMiloClassifyController.MaxDecodedBytes + 1];
        oversized[0] = 0xAB;
        var b64 = Convert.ToBase64String(oversized);

        var result = await _controller.ClassifyPreview(
            new ClassifyPreviewRequest { FileBase64 = b64, MimeType = "image/jpeg" },
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ClassifyPreview_WhenValid_CallsClassifierAndReturnsOk()
    {
        var png = new byte[] { 0x89, 0x50, 0x4E, 0x47 };
        _classifierMock
            .Setup(c => c.ClassifyFromBytesAsync(png, "image/png", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DocumentClassificationResult
            {
                Type = "vaccinations",
                Confidence = 0.95,
                Reasoning = "Looks like a vaccine record.",
            });
        _promptProviderMock.Setup(p => p.GetPromptForType("vaccinations")).Returns("extract prompt");

        var result = await _controller.ClassifyPreview(
            new ClassifyPreviewRequest
            {
                FileBase64 = Convert.ToBase64String(png),
                MimeType = "image/png",
            },
            CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<ClassifyResponse>().Subject;
        body.DocumentType.Should().Be("vaccinations");
        body.Confidence.Should().Be(0.95);
        body.Reasoning.Should().Be("Looks like a vaccine record.");
        body.ExtractionPrompt.Should().Be("extract prompt");
    }

    [Fact]
    public async Task ClassifyPreview_StripsDataUrlPrefix()
    {
        var png = new byte[] { 0x89, 0x50, 0x4E, 0x47 };
        _classifierMock
            .Setup(c => c.ClassifyFromBytesAsync(png, "image/png", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DocumentClassificationResult { Type = "irrelevant", Confidence = 0, Reasoning = null });
        _promptProviderMock.Setup(p => p.GetPromptForType(It.IsAny<string>())).Returns("p");

        var dataUrl = "data:image/png;base64," + Convert.ToBase64String(png);
        await _controller.ClassifyPreview(
            new ClassifyPreviewRequest { FileBase64 = dataUrl, MimeType = "image/png" },
            CancellationToken.None);

        _classifierMock.Verify(
            c => c.ClassifyFromBytesAsync(png, "image/png", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ClassifyExtractPreview_WhenValid_ReturnsClassificationAndFlexibleJson()
    {
        var png = new byte[] { 0x89, 0x50, 0x4E, 0x47 };
        _classifierMock
            .Setup(c => c.ClassifyFromBytesAsync(png, "image/png", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DocumentClassificationResult
            {
                Type = "vaccinations",
                Confidence = 88,
                Reasoning = "ok",
            });
        _promptProviderMock.Setup(p => p.GetPromptForType("vaccinations")).Returns("legacy prompt");
        _promptProviderMock.Setup(p => p.GetFlexibleExtractionPrompt("vaccinations")).Returns("flex prompt");

        const string extracted = """{"title":"Rabies","summary":"Cert","primaryDate":null,"keyFacts":[],"confidenceScore":90}""";
        _miloVisionMock
            .Setup(v => v.PreviewFlexibleExtractionAsync(png, "image/png", "vaccinations", It.IsAny<CancellationToken>()))
            .ReturnsAsync(extracted);

        var result = await _controller.ClassifyExtractPreview(
            new ClassifyPreviewRequest
            {
                FileBase64 = Convert.ToBase64String(png),
                MimeType = "image/png",
            },
            CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<MiloClassifyExtractPreviewResponse>().Subject;
        body.DocumentType.Should().Be("vaccinations");
        body.NormalizedDocumentType.Should().Be("vaccinations");
        body.FlexibleExtractionPrompt.Should().Be("flex prompt");
        body.ExtractionPromptByType.Should().Be("legacy prompt");
        body.ExtractedJson.Should().Be(extracted);
        body.ExtractionError.Should().BeNull();
    }
}
