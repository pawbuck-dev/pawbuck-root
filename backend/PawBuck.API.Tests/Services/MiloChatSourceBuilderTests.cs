using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloChatSourceBuilderTests
{
    [Fact]
    public void FromDocumentationChunk_UsesSourceFileInLabel()
    {
        var chunk = new DocumentationChunk
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            MetadataJson = """{"source_file":"08-milo.md","section":"Opening Milo"}""",
        };

        var source = MiloChatSourceBuilder.FromDocumentationChunk(chunk);
        source.Type.Should().Be(MiloChatSourceBuilder.TypeDocumentation);
        source.Label.Should().Contain("08-milo.md");
    }

    [Fact]
    public void FromCuratedSnippet_IncludesTopicAndAttribution()
    {
        var snippet = new MiloCuratedSnippetDto
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Topic = "weight_range",
            SourceAttribution = "General guidance",
        };

        var source = MiloChatSourceBuilder.FromCuratedSnippet(snippet);
        source.Type.Should().Be(MiloChatSourceBuilder.TypeCurated);
        source.Label.Should().Contain("weight_range");
    }
}
