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

/// <summary>Journal tree routing, heuristic RAG override, and access guards on <see cref="MiloReasoningService.ChatAsync"/>.</summary>
public class MiloReasoningServiceRoutingTests
{
    private static readonly Guid UserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid PetId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    private static MiloReasoningService CreateSut(
        HttpMessageHandler? handler = null,
        Mock<IMiloPetFactsService>? petFacts = null,
        Mock<IKnowledgeBaseService>? kb = null,
        Mock<IMiloJournalConfigProvider>? journalConfig = null,
        Mock<IJournalTreeInterviewService>? treeInterview = null)
    {
        handler ??= new PlanAnswerHandler(needsRag: false);

        var pf = petFacts ?? new Mock<IMiloPetFactsService>();
        if (petFacts == null)
            pf.Setup(p => p.VerifyPetAccessAsync(UserId, PetId, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var knowledge = kb ?? new Mock<IKnowledgeBaseService>();
        if (kb == null)
            knowledge.Setup(k => k.GetContextAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyList<string>?>()))
                .ReturnsAsync(Array.Empty<DocumentationChunk>());

        var journal = journalConfig ?? new Mock<IMiloJournalConfigProvider>();
        if (journalConfig == null)
            journal.Setup(j => j.GetAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new MiloJournalConfigSnapshot
            {
                PromptVersion = "test",
                JournalTreeInterviewEnabled = false,
            });

        var tree = treeInterview ?? new Mock<IJournalTreeInterviewService>();
        if (treeInterview == null)
            tree.Setup(t => t.TryRunTurnAsync(It.IsAny<MiloChatRequest>(), UserId, PetId, It.IsAny<MiloJournalConfigSnapshot>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((MiloChatResponse?)null);

        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("Gemini")).Returns(() => new HttpClient(handler, disposeHandler: true));

        return new MiloReasoningService(
            pf.Object,
            new Mock<IPetConversationalContextService>().Object,
            journal.Object,
            new Mock<IMiloJournalTurnService>().Object,
            tree.Object,
            knowledge.Object,
            factory.Object,
            Options.Create(new GeminiOptions { ApiKey = "k", Model = "gemini-2.5-flash" }),
            Options.Create(new MiloOptions()),
            NullLogger<MiloReasoningService>.Instance);
    }

    private static MiloChatRequest JournalRequest(string message = "My dog is coughing") => new()
    {
        Message = message,
        JournalMode = true,
        Pet = new MiloPetContextDto
        {
            Id = PetId.ToString("D"),
            Name = "Rex",
            AnimalType = "dog",
            Breed = "Mix",
            DateOfBirth = "2020-01-01",
            Sex = "male",
            WeightValue = 10,
            WeightUnit = "kg",
        },
    };

    [Fact]
    public async Task ChatAsync_ReturnsPrompt_WhenMessageEmpty()
    {
        var sut = CreateSut();

        var response = await sut.ChatAsync(UserId, new MiloChatRequest { Message = "  " }, CancellationToken.None);

        response.Answer.Should().Contain("Please enter a message");
    }

    [Fact]
    public async Task ChatAsync_ReturnsAccessError_WhenPetNotAccessible()
    {
        var petFacts = new Mock<IMiloPetFactsService>();
        petFacts.Setup(p => p.VerifyPetAccessAsync(UserId, PetId, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var sut = CreateSut(petFacts: petFacts);

        var response = await sut.ChatAsync(UserId, JournalRequest(), CancellationToken.None);

        response.Answer.Should().Contain("can't access health data");
    }

    [Fact]
    public async Task ChatAsync_JournalMode_ReturnsTreeResponse_WhenTryRunTurnAsyncSucceeds()
    {
        var tree = new Mock<IJournalTreeInterviewService>();
        var treeResponse = new MiloChatResponse { Answer = "Tree turn", InterviewPhase = "question" };
        tree
            .Setup(t => t.TryRunTurnAsync(It.IsAny<MiloChatRequest>(), UserId, PetId, It.IsAny<MiloJournalConfigSnapshot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(treeResponse);

        var journalConfig = new Mock<IMiloJournalConfigProvider>();
        journalConfig.Setup(j => j.GetAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new MiloJournalConfigSnapshot
        {
            JournalTreeInterviewEnabled = true,
            PromptVersion = "v1",
        });

        var sut = CreateSut(journalConfig: journalConfig, treeInterview: tree);

        var response = await sut.ChatAsync(UserId, JournalRequest(), CancellationToken.None);

        response.Answer.Should().Be("Tree turn");
        response.InterviewPhase.Should().Be("question");
    }

    [Fact]
    public async Task ChatAsync_JournalMode_ReturnsTopicPicker_WhenTreeEnabledAndNoSession()
    {
        var journalConfig = new Mock<IMiloJournalConfigProvider>();
        journalConfig.Setup(j => j.GetAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new MiloJournalConfigSnapshot
        {
            JournalTreeInterviewEnabled = true,
            PromptVersion = "v1",
        });

        var sut = CreateSut(journalConfig: journalConfig);

        var response = await sut.ChatAsync(UserId, JournalRequest(), CancellationToken.None);

        response.SuggestedReplies.Should().NotBeEmpty();
        response.SuggestedReplies.Should().Contain("Coughing");
        response.JournalStatus.Should().Be("CONTINUE");
    }

    [Fact]
    public async Task ChatAsync_UsesHeuristicRag_WhenPlannerOmitsFlag()
    {
        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(It.IsAny<string>(), 5, It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyList<string>?>()))
            .ReturnsAsync(new List<DocumentationChunk> { new() { Id = Guid.NewGuid(), Content = "Journal lives under Milo tab." } });

        var sut = CreateSut(
            handler: new PlanAnswerHandler(needsRag: false),
            kb: kb);

        var response = await sut.ChatAsync(UserId, new MiloChatRequest
        {
            Message = "How do I log symptoms in pet journal?",
            JournalMode = false,
        }, CancellationToken.None);

        response.UsedRag.Should().BeTrue();
        kb.Verify(k => k.GetContextAsync(
            It.Is<string>(q => q.Contains("journal", StringComparison.OrdinalIgnoreCase)),
            5,
            It.IsAny<CancellationToken>(),
            It.IsAny<IReadOnlyList<string>?>()), Times.Once);
    }

    [Fact]
    public async Task ChatAsync_UsedRagFalse_WhenRagRequestedButKbEmpty()
    {
        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(It.IsAny<string>(), 5, It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyList<string>?>()))
            .ReturnsAsync(Array.Empty<DocumentationChunk>());

        var sut = CreateSut(
            handler: new PlanAnswerHandler(needsRag: true),
            kb: kb);

        var response = await sut.ChatAsync(UserId, new MiloChatRequest
        {
            Message = "How do I upload vaccination records?",
            JournalMode = false,
        }, CancellationToken.None);

        response.UsedRag.Should().BeFalse();
    }

    private sealed class PlanAnswerHandler : HttpMessageHandler
    {
        private readonly bool _needsRag;

        public PlanAnswerHandler(bool needsRag) => _needsRag = needsRag;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var raw = await request.Content!.ReadAsStringAsync(cancellationToken);
            if (raw.Contains("planning module", StringComparison.Ordinal))
            {
                var planJson = JsonSerializer.Serialize(new MiloChatPlanDto
                {
                    DataNeeded = new List<string> { MiloPetFactsKinds.None },
                    NeedsDocumentationRag = _needsRag,
                    ReasoningBrief = "test",
                });
                return GeminiOk(planJson);
            }

            return GeminiOk("Here is help from docs.");
        }

        private static HttpResponseMessage GeminiOk(string innerText)
        {
            var json = JsonSerializer.Serialize(new
            {
                candidates = new[] { new { content = new { parts = new[] { new { text = innerText } } } } },
            });
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            };
        }
    }
}
