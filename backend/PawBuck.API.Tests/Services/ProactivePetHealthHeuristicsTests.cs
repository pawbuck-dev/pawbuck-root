using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class ProactivePetHealthHeuristicsTests
{
    [Fact]
    public void JournalTextMatchesMobilityKeywords_WhenStiffness_ReturnsTrue()
    {
        ProactivePetHealthHeuristics.JournalTextMatchesMobilityKeywords(
                "Rex showed stiffness after the walk",
                new[] { "stiffness", "slow" })
            .Should().BeTrue();
    }

    [Fact]
    public void JournalTextMatchesMobilityKeywords_WhenSlow_ReturnsTrue()
    {
        ProactivePetHealthHeuristics.JournalTextMatchesMobilityKeywords(
                "Very slow on stairs today",
                new[] { "stiffness", "slow" })
            .Should().BeTrue();
    }

    [Fact]
    public void JournalTextMatchesMobilityKeywords_WhenNoMatch_ReturnsFalse()
    {
        ProactivePetHealthHeuristics.JournalTextMatchesMobilityKeywords(
                "Great appetite and energy",
                new[] { "stiffness", "slow" })
            .Should().BeFalse();
    }

    [Fact]
    public void JournalTextMatchesMobilityKeywords_IsCaseInsensitive()
    {
        ProactivePetHealthHeuristics.JournalTextMatchesMobilityKeywords(
                "STIFFNESS noted",
                new[] { "stiffness" })
            .Should().BeTrue();
    }
}
