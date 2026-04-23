using FluentAssertions;
using PawBuck.API.Models;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloPetFactsKindsTests
{
    [Theory]
    [InlineData("vaccinations", "vaccinations")]
    [InlineData("VACCINATIONS", "vaccinations")]
    [InlineData("health_summary", "health_summary")]
    [InlineData("journal", "journal")]
    [InlineData("JOURNAL", "journal")]
    public void Normalize_AcceptsCanonicalEnums(string input, string expected)
    {
        MiloPetFactsKinds.Normalize(input).Should().Be(expected);
    }

    [Fact]
    public void Normalize_Unknown_ReturnsNull()
    {
        MiloPetFactsKinds.Normalize("random").Should().BeNull();
    }
}
