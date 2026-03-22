using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class ClassificationServiceTests
{
    private readonly Mock<IDocumentClassifier> _classifierMock;
    private readonly Mock<IMiloPromptProvider> _promptProviderMock;
    private readonly Mock<ILogger<ClassificationService>> _loggerMock;
    private readonly ClassificationService _sut;

    public ClassificationServiceTests()
    {
        _classifierMock = new Mock<IDocumentClassifier>();
        _promptProviderMock = new Mock<IMiloPromptProvider>();
        _loggerMock = new Mock<ILogger<ClassificationService>>();
        _sut = new ClassificationService(
            _classifierMock.Object,
            _promptProviderMock.Object,
            _loggerMock.Object);
    }

    [Fact]
    public async Task ClassifyAsync_WhenClassifierReturnsVaccine_ReturnsVaccineTypeAndPrompt()
    {
        const string imageUrl = "https://example.com/vaccine-cert.jpg";
        const string expectedPrompt = "Milo extraction prompt for Vaccine";

        _classifierMock
            .Setup(c => c.ClassifyAsync(imageUrl, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DocumentClassificationResult
            {
                Type = "Vaccine",
                Confidence = 92,
                Reasoning = "Vaccination certificate with dates."
            });

        _promptProviderMock
            .Setup(p => p.GetPromptForType("Vaccine"))
            .Returns(expectedPrompt);

        var result = await _sut.ClassifyAsync(imageUrl);

        result.Should().NotBeNull();
        result.DocumentType.Should().Be("Vaccine");
        result.Confidence.Should().Be(92);
        result.Reasoning.Should().Contain("Vaccination");
        result.ExtractionPrompt.Should().Be(expectedPrompt);
        _promptProviderMock.Verify(p => p.GetPromptForType("Vaccine"), Times.Once);
    }

    [Fact]
    public async Task ClassifyAsync_WhenClassifierReturnsInvoice_ReturnsInvoiceTypeAndPrompt()
    {
        const string imageUrl = "https://example.com/receipt.jpg";

        _classifierMock
            .Setup(c => c.ClassifyAsync(imageUrl, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DocumentClassificationResult
            {
                Type = "Invoice",
                Confidence = 88,
                Reasoning = "Vet receipt with line items."
            });

        _promptProviderMock
            .Setup(p => p.GetPromptForType("Invoice"))
            .Returns("Milo extraction prompt for Invoice");

        var result = await _sut.ClassifyAsync(imageUrl);

        result.DocumentType.Should().Be("Invoice");
        result.Confidence.Should().Be(88);
        result.ExtractionPrompt.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task ClassifyAsync_WhenClassifierReturnsPrescription_ReturnsPrescriptionTypeAndPrompt()
    {
        const string imageUrl = "https://example.com/rx.jpg";

        _classifierMock
            .Setup(c => c.ClassifyAsync(imageUrl, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DocumentClassificationResult
            {
                Type = "Prescription",
                Confidence = 75,
                Reasoning = "Medication instructions."
            });

        _promptProviderMock
            .Setup(p => p.GetPromptForType("Prescription"))
            .Returns("Milo extraction prompt for Prescription");

        var result = await _sut.ClassifyAsync(imageUrl);

        result.DocumentType.Should().Be("Prescription");
        result.ExtractionPrompt.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task ClassifyAsync_WhenClassifierReturnsIrrelevant_StillReturnsPromptFromProvider()
    {
        const string imageUrl = "https://example.com/random.jpg";

        _classifierMock
            .Setup(c => c.ClassifyAsync(imageUrl, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DocumentClassificationResult
            {
                Type = "Irrelevant",
                Confidence = 10,
                Reasoning = "Not a pet document."
            });

        _promptProviderMock
            .Setup(p => p.GetPromptForType("Irrelevant"))
            .Returns("Milo extraction prompt for Irrelevant");

        var result = await _sut.ClassifyAsync(imageUrl);

        result.DocumentType.Should().Be("Irrelevant");
        result.Confidence.Should().Be(10);
        result.ExtractionPrompt.Should().NotBeNullOrEmpty();
    }
}
