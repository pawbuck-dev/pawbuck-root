using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloPromptProviderTests
{
    private readonly MiloPromptProvider _sut = new();

    [Theory]
    [InlineData("Vaccine")]
    [InlineData("vaccinations")]
    [InlineData("Invoice")]
    [InlineData("billing_invoice")]
    [InlineData("Prescription")]
    [InlineData("medications")]
    [InlineData("Irrelevant")]
    [InlineData("irrelevant")]
    public void GetPromptForType_WhenKnownType_ReturnsNonEmptyPrompt(string documentType)
    {
        var prompt = _sut.GetPromptForType(documentType);

        prompt.Should().NotBeNullOrWhiteSpace();
        prompt.Should().Contain("veterinary document specialist");
        prompt.Should().Contain("petName");
        prompt.Should().Contain("documentType");
        prompt.Should().Contain("ISO-8601");
    }

    [Fact]
    public void GetPromptForType_WhenUnknownType_ReturnsDefaultMedicalRecordPrompt()
    {
        var prompt = _sut.GetPromptForType("UnknownType");

        prompt.Should().NotBeNullOrWhiteSpace();
        prompt.Should().Contain("veterinary document specialist");
    }

    [Fact]
    public void GetPromptForType_WhenNull_ReturnsDefaultPrompt()
    {
        var prompt = _sut.GetPromptForType(null!);

        prompt.Should().NotBeNullOrWhiteSpace();
    }
}
