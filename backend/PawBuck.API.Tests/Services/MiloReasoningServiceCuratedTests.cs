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

public class MiloReasoningServiceCuratedTests
{
    private static readonly Guid UserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid PetId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    [Fact]
    public async Task ChatAsync_WeightQuestion_UsesCuratedSnippetsInAnswerPrompt()
    {
        var sawCuratedBlock = false;
        var handler = new HttpMessageHandlerStub(raw =>
        {
            if (raw.Contains("planning module", StringComparison.Ordinal))
            {
                return JsonSerializer.Serialize(new MiloChatPlanDto
                {
                    DataNeeded = new List<string> { MiloPetFactsKinds.None },
                    NeedsDocumentationRag = false,
                    ReasoningBrief = "weight question",
                });
            }

            if (raw.Contains("Curated educational snippets", StringComparison.Ordinal)
                && raw.Contains("[Curated 1]", StringComparison.Ordinal))
                sawCuratedBlock = true;

            return "### Summary\n\nGeneral weight context only.\n\nPlease consult your veterinarian for a professional diagnosis and before making changes to your pet's medical care. 🐕";
        });

        var curated = new Mock<IMiloCuratedSnippetsService>();
        curated.Setup(s => s.GetGuidanceAsync("golden_retriever", "Dog", "weight_range", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MiloCuratedSnippetDto>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    Topic = "weight_range",
                    Content = "Adult Golden Retrievers span a wide healthy weight range.",
                    SourceAttribution = "Typical breed guide summary; not a diagnosis.",
                },
            });

        var petFacts = new Mock<IMiloPetFactsService>();
        petFacts.Setup(p => p.VerifyPetAccessAsync(UserId, PetId, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyList<string>?>()))
            .ReturnsAsync(Array.Empty<DocumentationChunk>());

        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("Gemini")).Returns(() => new HttpClient(handler, disposeHandler: true));

        var sut = new MiloReasoningService(
            petFacts.Object,
            new Mock<IPetConversationalContextService>().Object,
            new Mock<IMiloJournalConfigProvider>().Object,
            new Mock<IMiloJournalTurnService>().Object,
            new Mock<IJournalTreeInterviewService>().Object,
            kb.Object,
            curated.Object,
            GeminiTestSupport.CreateGenerateService(handler),
            factory.Object,
            Options.Create(new GeminiOptions { ApiKey = "k", Model = "gemini-2.5-flash" }),
            Options.Create(new MiloOptions()),
            NullLogger<MiloReasoningService>.Instance);

        var response = await sut.ChatAsync(UserId, new MiloChatRequest
        {
            Message = "Is 65 lb healthy for my Golden Retriever?",
            Pet = new MiloPetContextDto
            {
                Id = PetId.ToString("D"),
                Name = "Bailey",
                AnimalType = "Dog",
                Breed = "Golden Retriever",
            },
        }, CancellationToken.None);

        sawCuratedBlock.Should().BeTrue();
        response.UsedCurated.Should().BeTrue();
        response.Sources.Should().NotBeNull();
        response.Sources!.Should().Contain(s => s.Type == MiloChatSourceBuilder.TypeCurated);
    }

    private sealed class HttpMessageHandlerStub : HttpMessageHandler
    {
        private readonly Func<string, string> _responder;

        public HttpMessageHandlerStub(Func<string, string> responder) => _responder = responder;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var raw = request.Content!.ReadAsStringAsync(cancellationToken).GetAwaiter().GetResult();
            var inner = _responder(raw);
            var json = JsonSerializer.Serialize(new
            {
                candidates = new[] { new { content = new { parts = new[] { new { text = inner } } } } },
            });
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            });
        }
    }
}
