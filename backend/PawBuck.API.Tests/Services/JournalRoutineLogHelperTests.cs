using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class JournalRoutineLogHelperTests
{
    [Theory]
    [InlineData("Log 2 bowls of food", true)]
    [InlineData("Log 2 glasses of water", true)]
    [InlineData("Milo is vomiting", false)]
    public void IsRoutineJournalLog_classifies_messages(string message, bool expected)
    {
        JournalRoutineLogHelper.IsRoutineJournalLog(message).Should().Be(expected);
    }

    [Fact]
    public void TryBuildOneShotResponse_completes_meal_log_in_one_turn()
    {
        var r = JournalRoutineLogHelper.TryBuildOneShotResponse("Log 2 bowls of food", "Milo");
        r.Should().NotBeNull();
        r!.JournalSessionComplete.Should().BeTrue();
        r.Answer.Should().Contain("Milo");
        r.Answer.Should().NotContain("How long");
        r.StructuredSummary!.Fields["TYPE"].Should().Be("Diet");
    }
}
