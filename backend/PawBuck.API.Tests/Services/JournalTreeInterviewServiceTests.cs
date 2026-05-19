using FluentAssertions;
using PawBuck.API.Models;
using Xunit;

namespace PawBuck.API.Tests.Services;

/// <summary>Tests red-flag evaluation via public tree JSON contracts (loaded in integration tests).</summary>
public class JournalTreeInterviewServiceTests
{
    [Fact]
    public void JournalStructuredSummaryDto_defaults_lowConfidence_false()
    {
        var s = new JournalStructuredSummaryDto { Fields = new Dictionary<string, string> { ["SYMPTOM"] = "Vomiting" } };
        s.LowConfidence.Should().BeFalse();
    }

    [Fact]
    public void JournalInterviewPhases_has_expected_values()
    {
        JournalInterviewPhases.ContextSurface.Should().Be("context_surface");
        JournalInterviewPhases.Complete.Should().Be("complete");
    }
}
