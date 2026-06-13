using System.Text.Json;
using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class JournalTreeSummaryBuilderTests
{
    private static JournalTreeDefinitionDto VomitingTree() => new()
    {
        TreeId = "vomiting_v1.5",
        SummaryFieldMap = new Dictionary<string, string>
        {
            ["PATTERN"] = "{q_character_vomit} {q_character_stool}",
            ["APPETITE"] = "{q_systemic:appetite}",
            ["ENERGY"] = "{q_systemic:energy}",
        },
        Questions =
        [
            new()
            {
                Id = "q_systemic",
                Type = "multi",
                Options =
                [
                    new() { Id = "off_food", Label = "Off food" },
                    new() { Id = "drinking_less", Label = "Drinking less" },
                    new() { Id = "tired", Label = "Tired / sleeping more" },
                ],
            },
        ],
    };

    [Fact]
    public void Pattern_omits_unanswered_branch_placeholders()
    {
        var tree = new JournalTreeDefinitionDto
        {
            TreeId = "vomiting_v1.5",
            SummaryFieldMap = new Dictionary<string, string>
            {
                ["PATTERN"] = "{q_character_vomit} {q_character_stool}",
            },
        };
        var answers = new Dictionary<string, JsonElement>
        {
            ["q_character_vomit"] = JsonSerializer.SerializeToElement(new { text = "Yellow bile", chips = new[] { "bile" } }),
        };

        var fields = JournalTreeSummaryBuilder.BuildFields(tree, answers, "Max");
        fields["PATTERN"].Should().Be("Yellow bile");
    }

    [Fact]
    public void Systemic_slices_split_appetite_and_energy()
    {
        var tree = VomitingTree();
        var answers = new Dictionary<string, JsonElement>
        {
            ["q_systemic"] = JsonSerializer.SerializeToElement(new
            {
                text = "Off food, Drinking less, Tired / sleeping more",
                chips = new[] { "off_food", "drinking_less", "tired" },
            }),
        };

        var fields = JournalTreeSummaryBuilder.BuildFields(tree, answers, "Max");
        fields["APPETITE"].Should().Be("Off food, Drinking less");
        fields["ENERGY"].Should().Be("Tired / sleeping more");
        fields["APPETITE"].Should().NotBe(fields["ENERGY"]);
    }

    [Fact]
    public void BuildFields_omits_unanswered_summary_keys()
    {
        var tree = new JournalTreeDefinitionDto
        {
            TreeId = "vomiting_v1.5",
            SummaryFieldMap = new Dictionary<string, string>
            {
                ["SYMPTOM"] = "Vomiting / diarrhea",
                ["ONSET"] = "{q_timing}",
                ["NOTE"] = "{q_freeform}",
            },
        };
        var answers = new Dictionary<string, JsonElement>
        {
            ["q_timing"] = JsonSerializer.SerializeToElement(new { text = "Just started today / 2–3 times", chips = new[] { "today", "2_3" } }),
        };

        var fields = JournalTreeSummaryBuilder.BuildFields(tree, answers, "Milo");
        fields.Should().ContainKey("SYMPTOM");
        fields.Should().ContainKey("ONSET");
        fields.Should().NotContainKey("NOTE");
    }

    [Fact]
    public void FormatPlainSummary_skips_unspecified_fields()
    {
        var text = JournalTreeSummaryBuilder.FormatPlainSummary(new Dictionary<string, string>
        {
            ["NOTE"] = "Not specified",
            ["ONSET"] = "Acute, today. Frequency: 2-3 episodes",
        });
        text.Should().Be("ONSET: Acute, today. Frequency: 2-3 episodes");
    }

    [Fact]
    public void StripUnspecifiedFieldLines_removes_not_specified_lines()
    {
        var input = "NOTE: Not specified\nONSET: Acute, today. Frequency: 2-3 episodes";
        JournalTreeSummaryBuilder.StripUnspecifiedFieldLines(input)
            .Should()
            .Be("ONSET: Acute, today. Frequency: 2-3 episodes");
    }
}
