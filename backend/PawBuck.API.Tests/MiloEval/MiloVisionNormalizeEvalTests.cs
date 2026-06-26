using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.MiloEval;

public class MiloVisionNormalizeEvalTests
{
    [Theory]
    [InlineData("vaccinations", "vaccinations")]
    [InlineData("VACCINATIONS", "vaccinations")]
    [InlineData(" lab_results ", "lab_results")]
    [InlineData("unknown_type", "irrelevant")]
    [InlineData(null, "irrelevant")]
    public void NormalizeVaultDocumentType_MapsKnownAndFallbackValues(string? raw, string expected) =>
        MiloVisionService.NormalizeVaultDocumentType(raw).Should().Be(expected);
}
