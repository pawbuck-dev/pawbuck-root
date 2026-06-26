using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloRagServiceTests
{
    private static MiloRagService CreateService(
        IKnowledgeBaseService kb,
        HttpMessageHandler handler,
        GeminiOptions? geminiOptions = null)
    {
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("Gemini")).Returns(() => new HttpClient(handler, disposeHandler: true));
        return new MiloRagService(
            kb,
            GeminiTestSupport.CreateGenerateService(handler),
            Options.Create(geminiOptions ?? new GeminiOptions { ApiKey = "test-key", Model = "gemini-2.5-flash" }),
            NullLogger<MiloRagService>.Instance);
    }

    private static HttpResponseMessage GeminiOk(string text)
    {
        var json = JsonSerializer.Serialize(new
        {
            candidates = new[]
            {
                new { content = new { parts = new[] { new { text } } } },
            },
        });
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
    }

    [Fact]
    public async Task AskAsync_ReturnsGeneralHelp_WhenQuestionWhitespace()
    {
        var kb = new Mock<IKnowledgeBaseService>();
        var sut = CreateService(kb.Object, new StubHandler(_ => GeminiOk("x")));

        var result = await sut.AskAsync("   ", CancellationToken.None);

        result.IsGeneralHelp.Should().BeTrue();
        result.UsedContext.Should().BeFalse();
        kb.Verify(
            k => k.GetContextAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyList<string>?>()),
            Times.Never);
    }

    [Fact]
    public async Task AskAsync_ReturnsGeneralHelp_WhenKbEmpty()
    {
        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(It.IsAny<string>(), 5, It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyList<string>?>()))
            .ReturnsAsync(Array.Empty<DocumentationChunk>());

        var sut = CreateService(kb.Object, new StubHandler(_ => GeminiOk("x")));

        var result = await sut.AskAsync("How do I add a pet?", CancellationToken.None);

        result.IsGeneralHelp.Should().BeTrue();
        result.UsedContext.Should().BeFalse();
        result.Answer.Should().Be(MiloRagService.GENERAL_HELP_RESPONSE);
    }

    [Fact]
    public async Task AskAsync_ReturnsAnswerWithContext_WhenKbAndGeminiSucceed()
    {
        var chunkId = Guid.NewGuid();
        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(It.IsAny<string>(), 5, It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyList<string>?>()))
            .ReturnsAsync(new List<DocumentationChunk>
            {
                new() { Id = chunkId, Content = "Open Health Records to upload vaccines." },
            });

        var sut = CreateService(kb.Object, new StubHandler(_ => GeminiOk("Upload from Health Records tab.")));

        var result = await sut.AskAsync("Where do I upload vaccines?", CancellationToken.None);

        result.IsGeneralHelp.Should().BeFalse();
        result.UsedContext.Should().BeTrue();
        result.Answer.Should().Contain("Health Records");
        result.SourceIds.Should().Contain(chunkId.ToString());
    }

    [Fact]
    public async Task AskAsync_PassesBoostFiles_WhenProductHelpQuestion()
    {
        IReadOnlyList<string>? capturedBoost = null;
        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(
                It.IsAny<string>(),
                5,
                It.IsAny<CancellationToken>(),
                It.IsAny<IReadOnlyList<string>?>()))
            .Callback<string, int, CancellationToken, IReadOnlyList<string>?>((_, _, _, boost) => capturedBoost = boost)
            .ReturnsAsync(Array.Empty<DocumentationChunk>());

        var sut = CreateService(kb.Object, new StubHandler(_ => GeminiOk("x")));

        await sut.AskAsync("How do I use pet journal in PawBuck?", CancellationToken.None);

        capturedBoost.Should().NotBeNull();
        capturedBoost!.Count.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task AskAsync_ReturnsGeneralHelp_WhenGeminiApiKeyMissing()
    {
        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(It.IsAny<string>(), 5, It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyList<string>?>()))
            .ReturnsAsync(new List<DocumentationChunk> { new() { Id = Guid.NewGuid(), Content = "ctx" } });

        var sut = CreateService(
            kb.Object,
            new StubHandler(_ => GeminiOk("ignored")),
            new GeminiOptions { ApiKey = null });

        var result = await sut.AskAsync("Help", CancellationToken.None);

        result.IsGeneralHelp.Should().BeTrue();
        result.UsedContext.Should().BeFalse();
    }

    [Fact]
    public async Task AskAsync_ReturnsGeneralHelp_WhenGeminiReturnsNonSuccess()
    {
        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(It.IsAny<string>(), 5, It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyList<string>?>()))
            .ReturnsAsync(new List<DocumentationChunk> { new() { Id = Guid.NewGuid(), Content = "ctx" } });

        var sut = CreateService(
            kb.Object,
            new StubHandler(_ => new HttpResponseMessage(HttpStatusCode.TooManyRequests)
            {
                Content = new StringContent("rate limited", Encoding.UTF8, "text/plain"),
            }));

        var result = await sut.AskAsync("Help", CancellationToken.None);

        result.IsGeneralHelp.Should().BeTrue();
        result.UsedContext.Should().BeFalse();
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;

        public StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) => _respond = respond;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(_respond(request));
    }
}
