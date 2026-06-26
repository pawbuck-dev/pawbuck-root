using System.Text.Json;
using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class GeminiResponseParserTests
{
    [Fact]
    public void TryExtractCandidateText_ParsesStandardShape()
    {
        var json = JsonSerializer.Serialize(new
        {
            candidates = new[]
            {
                new { content = new { parts = new[] { new { text = "hello" } } } },
            },
        });

        GeminiResponseParser.TryExtractCandidateText(json, out var text).Should().BeTrue();
        text.Should().Be("hello");
    }

    [Fact]
    public void TryParseUsageMetadata_ReadsTokenCounts()
    {
        var json = """
            {"usageMetadata":{"promptTokenCount":12,"candidatesTokenCount":34,"totalTokenCount":46}}
            """;

        var usage = GeminiResponseParser.TryParseUsageMetadata(json);
        usage.Should().NotBeNull();
        usage!.PromptTokenCount.Should().Be(12);
        usage.CandidatesTokenCount.Should().Be(34);
        usage.TotalTokenCount.Should().Be(46);
    }
}
