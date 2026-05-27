using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloJournalFeedbackRulesTests
{
    [Theory]
    [InlineData("up", true)]
    [InlineData("DOWN", true)]
    [InlineData(" down ", true)]
    [InlineData("maybe", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsValidRating_acceptsUpDownOnly(string? rating, bool expected)
    {
        MiloJournalFeedbackRules.IsValidRating(rating).Should().Be(expected);
    }

    [Fact]
    public void IsWithinFeedbackWindow_allowsRecentTurn()
    {
        var created = DateTime.UtcNow.AddDays(-3);
        MiloJournalFeedbackRules.IsWithinFeedbackWindow(created, DateTime.UtcNow, TimeSpan.FromDays(14))
            .Should().BeTrue();
    }

    [Fact]
    public void IsWithinFeedbackWindow_rejectsExpiredTurn()
    {
        var created = DateTime.UtcNow.AddDays(-15);
        MiloJournalFeedbackRules.IsWithinFeedbackWindow(created, DateTime.UtcNow, TimeSpan.FromDays(14))
            .Should().BeFalse();
    }
}
