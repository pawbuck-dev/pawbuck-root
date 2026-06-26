using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PawBuck.API.Models;
using PawBuck.API.Services;
using PawBuck.API.Tests.Services;
using Xunit;

namespace PawBuck.API.Tests.MiloEval;

public class MiloJournalRedFlagEvalTests
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public static IEnumerable<object[]> TreeScenarioIds =>
        MiloEvalFixtureLoader.LoadJournalRedFlagScenarios()
            .Where(s => string.Equals(s.Mode, "tree", StringComparison.OrdinalIgnoreCase))
            .Select(s => new object[] { s.Id });

    public static IEnumerable<object[]> LegacyScenarioIds =>
        MiloEvalFixtureLoader.LoadJournalRedFlagScenarios()
            .Where(s => string.Equals(s.Mode, "legacy-gemini", StringComparison.OrdinalIgnoreCase))
            .Select(s => new object[] { s.Id });

    [Theory]
    [MemberData(nameof(TreeScenarioIds))]
    public void TreeRedFlagScenarios_MatchEvaluateEmergency(string scenarioId)
    {
        var scenario = MiloEvalFixtureLoader.LoadJournalRedFlagScenarios().Single(s => s.Id == scenarioId);
        scenario.TreeId.Should().NotBeNullOrWhiteSpace();
        var treePath = MiloEvalPaths.JournalTreePath(scenario.TreeId!);
        File.Exists(treePath).Should().BeTrue($"tree file missing: {treePath}");

        var tree = JsonSerializer.Deserialize<JournalTreeDefinitionDto>(File.ReadAllText(treePath), JsonOptions)
            ?? throw new InvalidOperationException($"Could not parse tree {scenario.TreeId}");

        var answers = BuildAnswers(scenario.Answers);
        var emergency = JournalTreeRedFlagEvaluator.EvaluateEmergency(tree, answers);
        emergency.Should().Be(scenario.ExpectEmergency, $"scenario {scenarioId}");
    }

    [Theory]
    [MemberData(nameof(LegacyScenarioIds))]
    public async Task LegacyJournalScenarios_ReturnEmergencyStopWhenTokenReturned(string scenarioId)
    {
        var scenario = MiloEvalFixtureLoader.LoadJournalRedFlagScenarios().Single(s => s.Id == scenarioId);
        var handler = new LegacyJournalHandler(scenario.ModelAnswerToken ?? ContextEngine.JournalEmergencyRedFlagToken);
        var service = CreateJournalService(handler);

        var response = await service.ChatAsync(
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            new MiloChatRequest
            {
                Message = scenario.UserMessage ?? "Emergency",
                JournalMode = true,
                Pet = new MiloPetContextDto
                {
                    Id = Guid.Parse("22222222-2222-2222-2222-222222222222").ToString(),
                    Name = "Rex",
                },
            },
            CancellationToken.None);

        response.JournalEmergencyStop.Should().Be(scenario.ExpectEmergencyStop, scenarioId);
        if (scenario.ExpectSessionComplete == false)
            response.JournalSessionComplete.Should().BeFalse(scenarioId);
        response.Answer.Should().Contain("emergency", scenarioId);
    }

    [Fact]
    public void JournalRedFlagScenarios_MeetPhase2MinimumCount()
    {
        var scenarios = MiloEvalFixtureLoader.LoadJournalRedFlagScenarios();
        scenarios.Count.Should().BeGreaterOrEqualTo(10);
        scenarios.Count(s => s.Mode == "tree").Should().BeGreaterOrEqualTo(6);
        scenarios.Count(s => s.Mode == "legacy-gemini").Should().BeGreaterOrEqualTo(3);
    }

    private static Dictionary<string, JsonElement> BuildAnswers(Dictionary<string, string[]>? answers)
    {
        var dict = new Dictionary<string, JsonElement>();
        if (answers == null)
            return dict;

        foreach (var (key, chips) in answers)
            dict[key] = JsonSerializer.SerializeToElement(new { chips });

        return dict;
    }

    private sealed class LegacyJournalHandler : HttpMessageHandler
    {
        private readonly string _innerText;

        public LegacyJournalHandler(string innerText) => _innerText = innerText;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var payload = JsonSerializer.Serialize(new
            {
                answer = _innerText,
                status = "CONTINUE",
                summary = "",
                suggestedReplies = Array.Empty<string>(),
            });
            var json = JsonSerializer.Serialize(new
            {
                candidates = new[]
                {
                    new { content = new { parts = new[] { new { text = payload } } } },
                },
            });
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            });
        }
    }

    private static MiloReasoningService CreateJournalService(HttpMessageHandler handler)
    {
        var userId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var petId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        var petFacts = new Mock<IMiloPetFactsService>();
        petFacts.Setup(p => p.VerifyPetAccessAsync(userId, petId, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        petFacts.Setup(p => p.GetUserPetRoleAsync(userId, petId, It.IsAny<CancellationToken>())).ReturnsAsync("owner");

        var journalConfig = new Mock<IMiloJournalConfigProvider>();
        journalConfig.Setup(c => c.GetAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new MiloJournalConfigSnapshot
        {
            PromptVersion = "v2-test",
            JournalTreeInterviewEnabled = false,
        });

        var conversationalContext = new Mock<IPetConversationalContextService>();
        conversationalContext.Setup(c => c.GetPetConversationalContextAsync(
                userId,
                petId,
                It.IsAny<MiloJournalConfigSnapshot>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PetConversationalContextDto
            {
                PetProfile = new PetProfileSnapshot { Name = "Rex", IsSenior = false },
            });

        var journalTurns = new Mock<IMiloJournalTurnService>();
        journalTurns.Setup(t => t.RegisterTurnAsync(
                userId,
                petId,
                It.IsAny<string>(),
                It.IsAny<IReadOnlyList<string>>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Guid.Parse("33333333-3333-3333-3333-333333333333"));

        var treeInterview = new Mock<IJournalTreeInterviewService>();
        treeInterview.Setup(t => t.TryRunTurnAsync(
                It.IsAny<MiloChatRequest>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<MiloJournalConfigSnapshot>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((MiloChatResponse?)null);

        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("Gemini")).Returns(() => new HttpClient(handler, disposeHandler: true));

        return new MiloReasoningService(
            petFacts.Object,
            conversationalContext.Object,
            journalConfig.Object,
            journalTurns.Object,
            treeInterview.Object,
            new Mock<IKnowledgeBaseService>().Object,
            GeminiTestSupport.EmptyCuratedSnippets(),
            GeminiTestSupport.CreateGenerateService(handler),
            factory.Object,
            Options.Create(new GeminiOptions { ApiKey = "test-key", Model = "gemini-2.5-flash" }),
            Options.Create(new MiloOptions()),
            NullLogger<MiloReasoningService>.Instance);
    }
}
