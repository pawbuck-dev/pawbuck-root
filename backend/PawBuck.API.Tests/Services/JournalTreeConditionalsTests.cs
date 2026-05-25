using System.Text.Json;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class JournalTreeConditionalsTests
{
    private static Dictionary<string, JsonElement> Answers(params (string q, string[] chips)[] rows)
    {
        var d = new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);
        foreach (var (q, chipIds) in rows)
        {
            d[q] = JsonSerializer.SerializeToElement(new { text = "", chips = chipIds });
        }
        return d;
    }

    [Fact]
    public void Eating_less_branch_requires_direction_chips()
    {
        var empty = new Dictionary<string, JsonElement>();
        Assert.False(JournalTreeConditionals.PassesConditional("eating_less_or_wont_eat", empty));

        var answers = Answers(("q_direction_onset", new[] { "eating_less" }));
        Assert.True(JournalTreeConditionals.PassesConditional("eating_less_or_wont_eat", answers));
        Assert.False(JournalTreeConditionals.PassesConditional("eating_more_or_asking", answers));
    }

    [Fact]
    public void Vomiting_branch_requires_q_type_chips()
    {
        var answers = Answers(("q_type", new[] { "vomiting" }));
        Assert.True(JournalTreeConditionals.PassesConditional("vomiting_or_both", answers));
        Assert.False(JournalTreeConditionals.PassesConditional("diarrhea_or_both", answers));
    }

    [Fact]
    public void Eye_or_both_matches_eye_and_both()
    {
        Assert.True(
            JournalTreeConditionals.PassesConditional(
                "eye_or_both",
                Answers(("q_type", new[] { "both" }))));
        Assert.False(
            JournalTreeConditionals.PassesConditional(
                "eye_or_both",
                Answers(("q_type", new[] { "ear" }))));
    }

    [Fact]
    public void Unknown_conditional_is_false()
    {
        Assert.False(JournalTreeConditionals.PassesConditional("made_up_branch", new Dictionary<string, JsonElement>()));
    }
}
