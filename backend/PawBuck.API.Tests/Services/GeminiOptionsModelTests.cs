using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class GeminiOptionsModelTests
{
    [Theory]
    [InlineData("gemini-1.5-flash")]
    [InlineData("Gemini-1.5-Flash")]
    [InlineData("gemini-1.5-pro")]
    [InlineData("gemini-1.5-flash-8b")]
    public void IsLikelyUnsupportedGenerativeLanguageModel_true_for_legacy_short_names(string modelId) =>
        Assert.True(GeminiOptions.IsLikelyUnsupportedGenerativeLanguageModel(modelId));

    [Theory]
    [InlineData("gemini-2.5-flash")]
    [InlineData("gemini-2.0-flash")]
    [InlineData("")]
    [InlineData("gemini-1.5-flash-002")]
    public void IsLikelyUnsupportedGenerativeLanguageModel_false_for_supported_or_versioned(string modelId) =>
        Assert.False(GeminiOptions.IsLikelyUnsupportedGenerativeLanguageModel(modelId));

    [Fact]
    public void IsLikelyUnsupportedGenerativeLanguageModel_false_for_null() =>
        Assert.False(GeminiOptions.IsLikelyUnsupportedGenerativeLanguageModel(null));
}
