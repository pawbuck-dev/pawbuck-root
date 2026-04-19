using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class GeminiClassifierMimeTests
{
    [Theory]
    [InlineData(null, "image/jpeg")]
    [InlineData("", "image/jpeg")]
    [InlineData("  ", "image/jpeg")]
    [InlineData("image/jpg", "image/jpeg")]
    [InlineData("IMAGE/JPEG", "image/jpeg")]
    [InlineData("image/png", "image/png")]
    [InlineData("image/webp", "image/webp")]
    [InlineData("image/heic", "image/heic")]
    [InlineData("application/pdf", "application/pdf")]
    [InlineData("application/octet-stream", "image/jpeg")]
    public void NormalizeMimeForClassification_MapsExpected(string? input, string expected)
    {
        GeminiClassifier.NormalizeMimeForClassification(input).Should().Be(expected);
    }
}
