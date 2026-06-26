using System.Text.Json;
using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.MiloEval;

public class JournalTreeRedFlagEvaluatorTests
{
    [Fact]
    public void EvaluateEmergency_WhenIfAllAnswerIdsMatch_ReturnsTrue()
    {
        var tree = new JournalTreeDefinitionDto
        {
            TreeId = "test",
            RedFlagTriggers =
            {
                new JournalTreeRedFlagTriggerDto
                {
                    IfAllAnswerIds = new List<string> { "a", "b", "c" },
                    Level = "emergency",
                },
            },
        };

        var answers = new Dictionary<string, JsonElement>
        {
            ["q1"] = JsonSerializer.SerializeToElement(new { chips = new[] { "a", "b" } }),
            ["q2"] = JsonSerializer.SerializeToElement(new { chips = new[] { "c" } }),
        };

        JournalTreeRedFlagEvaluator.EvaluateEmergency(tree, answers).Should().BeTrue();
    }

    [Fact]
    public void ShouldAskRedFlagScreen_WhenAlreadyEmergency_ReturnsFalse()
    {
        var tree = new JournalTreeDefinitionDto { TreeId = "test" };
        var answers = new Dictionary<string, JsonElement>();
        JournalTreeRedFlagEvaluator.ShouldAskRedFlagScreen(tree, answers, alreadyEmergency: true)
            .Should().BeFalse();
    }
}
