using System.Net;
using System.Net.Http.Headers;
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

/// <summary>
/// Journal mode: <see cref="MiloReasoningService.ChatAsync"/> with <see cref="MiloChatRequest.JournalMode"/> —
/// Gemini HTTP is stubbed; domain services are mocked.
/// </summary>
public class MiloReasoningServiceJournalTests
{
    private static readonly Guid UserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid PetId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid RegisteredTurnId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    private sealed class GeminiTestHandler : HttpMessageHandler
    {
        public HttpStatusCode StatusCode { get; set; } = HttpStatusCode.OK;
        public string InnerTextPart { get; set; } = "";

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (StatusCode != HttpStatusCode.OK)
            {
                return Task.FromResult(new HttpResponseMessage(StatusCode)
                {
                    Content = new StringContent("{}", Encoding.UTF8, "application/json"),
                });
            }

            var json = JsonSerializer.Serialize(new
            {
                candidates = new[]
                {
                    new
                    {
                        content = new
                        {
                            parts = new[] { new { text = InnerTextPart } },
                        },
                    },
                },
            });
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            });
        }
    }

    private static MiloReasoningService CreateService(
        HttpMessageHandler geminiHandler,
        Mock<IMiloJournalConfigProvider> journalConfig,
        Mock<IPetConversationalContextService> conversationalContext,
        Mock<IMiloJournalTurnService> journalTurns,
        string geminiApiKey = "test-api-key")
    {
        var petFacts = new Mock<IMiloPetFactsService>();
        petFacts.Setup(p => p.VerifyPetAccessAsync(UserId, PetId, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        petFacts.Setup(p => p.GetUserPetRoleAsync(UserId, PetId, It.IsAny<CancellationToken>())).ReturnsAsync("owner");
        petFacts.Setup(p => p.GetVaccinationsTextAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("");
        petFacts.Setup(p => p.GetMedicationsTextAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("");
        petFacts.Setup(p => p.GetLabResultsTextAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("");
        petFacts.Setup(p => p.GetClinicalExamsTextAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("");
        petFacts.Setup(p => p.GetHealthSummaryTextAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("");

        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("Gemini")).Returns(() => new HttpClient(geminiHandler, disposeHandler: true));

        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyList<string>>()))
            .ReturnsAsync(Array.Empty<DocumentationChunk>());

        var treeInterview = new Mock<IJournalTreeInterviewService>();
        treeInterview
            .Setup(t => t.TryRunTurnAsync(
                It.IsAny<MiloChatRequest>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<MiloJournalConfigSnapshot>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((MiloChatResponse?)null);

        return new MiloReasoningService(
            petFacts.Object,
            conversationalContext.Object,
            journalConfig.Object,
            journalTurns.Object,
            treeInterview.Object,
            kb.Object,
            factory.Object,
            Options.Create(new GeminiOptions { ApiKey = geminiApiKey, Model = "gemini-2.5-flash" }),
            Options.Create(new MiloOptions()),
            NullLogger<MiloReasoningService>.Instance);
    }

    private static Mock<IMiloJournalConfigProvider> ConfigMock(string promptVersion = "v2-test")
    {
        var m = new Mock<IMiloJournalConfigProvider>();
        m.Setup(c => c.GetAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new MiloJournalConfigSnapshot
        {
            PromptVersion = promptVersion,
            JournalTemperature = 0.65,
            JournalMaxOutputTokens = 1024,
            JournalTreeInterviewEnabled = false,
        });
        return m;
    }

    private static Mock<IPetConversationalContextService> ContextMock()
    {
        var ctx = new PetConversationalContextDto
        {
            PetProfile = new PetProfileSnapshot { Name = "Rex", IsSenior = false },
        };
        var m = new Mock<IPetConversationalContextService>();
        m.Setup(s => s.GetPetConversationalContextAsync(UserId, PetId, It.IsAny<MiloJournalConfigSnapshot>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ctx);
        return m;
    }

    private static Mock<IMiloJournalTurnService> TurnMock()
    {
        var m = new Mock<IMiloJournalTurnService>();
        m.Setup(t => t.RegisterTurnAsync(UserId, PetId, It.IsAny<string>(), It.IsAny<IReadOnlyList<string>>(), "journal", It.IsAny<CancellationToken>()))
            .ReturnsAsync(RegisteredTurnId);
        return m;
    }

    private static MiloChatRequest JournalRequest(string message = "How was your walk?")
    {
        return new MiloChatRequest
        {
            Message = message,
            JournalMode = true,
            Pet = new MiloPetContextDto
            {
                Id = PetId.ToString(),
                Name = "Rex",
            },
        };
    }

    [Fact]
    public async Task ChatAsync_JournalMode_WhenGeminiReturnsValidJson_ReturnsAnswerAndMetadata()
    {
        var inner = JsonSerializer.Serialize(new
        {
            answer = "Great to hear!",
            suggestedReplies = new[] { "More energy", "Same as usual" },
            status = "CONTINUE",
            summary = "",
        });
        var handler = new GeminiTestHandler { InnerTextPart = inner };
        var journalConfig = ConfigMock();
        var context = ContextMock();
        var turns = TurnMock();
        var sut = CreateService(handler, journalConfig, context, turns);

        var response = await sut.ChatAsync(UserId, JournalRequest(), CancellationToken.None);

        response.Answer.Should().Be("Great to hear!");
        response.SuggestedReplies.Should().BeEquivalentTo(
            new[] { "More energy", "Same as usual", JournalInterviewOrchestration.ChipNotSure, JournalInterviewOrchestration.ChipAddDetails },
            options => options.WithStrictOrdering());
        response.JournalSessionComplete.Should().BeFalse();
        response.JournalStatus.Should().Be("CONTINUE");
        response.JournalSummary.Should().BeNull();
        response.PromptVersion.Should().Be("v2-test");
        response.ResponseId.Should().Be(RegisteredTurnId);
        response.TurnId.Should().Be(RegisteredTurnId.ToString("D"));
        response.PetName.Should().Be("Rex");
        response.UsedRag.Should().BeFalse();
        turns.Verify(
            t => t.RegisterTurnAsync(UserId, PetId, "v2-test", It.IsAny<IReadOnlyList<string>>(), "journal", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ChatAsync_JournalMode_WhenInnerTextIsNotValidJson_ReturnsGenericSorryMessage()
    {
        var handler = new GeminiTestHandler { InnerTextPart = "not valid json {{{" };
        var sut = CreateService(handler, ConfigMock(), ContextMock(), TurnMock());

        var response = await sut.ChatAsync(UserId, JournalRequest(), CancellationToken.None);

        response.Answer.Should().Be("Sorry, I'm having trouble. Please try again! 🐕");
        response.ResponseId.Should().BeNull();
        response.PromptVersion.Should().BeNull();
    }

    [Fact]
    public async Task ChatAsync_JournalMode_WhenAnswerIsEmpty_ReturnsGenericSorryMessage()
    {
        var inner = JsonSerializer.Serialize(new
        {
            answer = "   ",
            suggestedReplies = Array.Empty<string>(),
            status = "CONTINUE",
            summary = "",
        });
        var handler = new GeminiTestHandler { InnerTextPart = inner };
        var sut = CreateService(handler, ConfigMock(), ContextMock(), TurnMock());

        var response = await sut.ChatAsync(UserId, JournalRequest(), CancellationToken.None);

        response.Answer.Should().Be("Sorry, I'm having trouble. Please try again! 🐕");
    }

    [Fact]
    public async Task ChatAsync_JournalMode_WhenGeminiApiKeyMissing_ReturnsNotConfiguredMessageWithoutCallingGemini()
    {
        var factoryNeverUsed = new Mock<IHttpClientFactory>();
        factoryNeverUsed.Setup(f => f.CreateClient("Gemini")).Throws(new InvalidOperationException("Gemini HTTP must not be called"));

        var petFacts = new Mock<IMiloPetFactsService>();
        petFacts.Setup(p => p.VerifyPetAccessAsync(UserId, PetId, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        petFacts.Setup(p => p.GetUserPetRoleAsync(UserId, PetId, It.IsAny<CancellationToken>())).ReturnsAsync("owner");
        petFacts.Setup(p => p.GetVaccinationsTextAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("");
        petFacts.Setup(p => p.GetMedicationsTextAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("");
        petFacts.Setup(p => p.GetLabResultsTextAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("");
        petFacts.Setup(p => p.GetClinicalExamsTextAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("");
        petFacts.Setup(p => p.GetHealthSummaryTextAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("");

        var kb = new Mock<IKnowledgeBaseService>();
        var journalConfig = ConfigMock();
        var context = ContextMock();
        var turns = TurnMock();

        var treeInterview = new Mock<IJournalTreeInterviewService>();
        treeInterview
            .Setup(t => t.TryRunTurnAsync(
                It.IsAny<MiloChatRequest>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<MiloJournalConfigSnapshot>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((MiloChatResponse?)null);

        var sut = new MiloReasoningService(
            petFacts.Object,
            context.Object,
            journalConfig.Object,
            turns.Object,
            treeInterview.Object,
            kb.Object,
            factoryNeverUsed.Object,
            Options.Create(new GeminiOptions { ApiKey = "", Model = "gemini-2.5-flash" }),
            Options.Create(new MiloOptions()),
            NullLogger<MiloReasoningService>.Instance);

        var response = await sut.ChatAsync(UserId, JournalRequest(), CancellationToken.None);

        response.Answer.Should().Be("I'm not quite configured yet. Please try again later! 🐕");
        factoryNeverUsed.Verify(f => f.CreateClient("Gemini"), Times.Never);
    }

    [Fact]
    public async Task ChatAsync_JournalMode_WhenGeminiReturnsNonSuccess_ReturnsGenericSorryMessage()
    {
        var handler = new GeminiTestHandler { StatusCode = HttpStatusCode.BadRequest, InnerTextPart = "" };
        var sut = CreateService(handler, ConfigMock(), ContextMock(), TurnMock());

        var response = await sut.ChatAsync(UserId, JournalRequest(), CancellationToken.None);

        response.Answer.Should().Be("Sorry, I'm having trouble. Please try again! 🐕");
    }

    private sealed class Gemini429ThenOkHandler : HttpMessageHandler
    {
        private int _call;
        public required string InnerTextPart { get; set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            _call++;
            if (_call == 1)
            {
                var resp = new HttpResponseMessage(HttpStatusCode.TooManyRequests)
                {
                    Content = new StringContent("{}", Encoding.UTF8, "application/json"),
                };
                resp.Headers.RetryAfter = new RetryConditionHeaderValue(TimeSpan.FromMilliseconds(1));
                return Task.FromResult(resp);
            }

            var json = JsonSerializer.Serialize(new
            {
                candidates = new[]
                {
                    new
                    {
                        content = new { parts = new[] { new { text = InnerTextPart } } },
                    },
                },
            });
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            });
        }
    }

    [Fact]
    public async Task ChatAsync_JournalMode_When429ThenSuccess_RetriesAndReturnsAnswer()
    {
        var inner = JsonSerializer.Serialize(new
        {
            answer = "Recovered",
            suggestedReplies = new[] { "Ok" },
            status = "CONTINUE",
            summary = "",
        });
        var handler = new Gemini429ThenOkHandler { InnerTextPart = inner };
        var sut = CreateService(handler, ConfigMock(), ContextMock(), TurnMock());

        var response = await sut.ChatAsync(UserId, JournalRequest(), CancellationToken.None);

        response.Answer.Should().Be("Recovered");
    }

    private sealed class GeminiAlways429Handler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var resp = new HttpResponseMessage(HttpStatusCode.TooManyRequests)
            {
                Content = new StringContent("{}", Encoding.UTF8, "application/json"),
            };
            resp.Headers.RetryAfter = new RetryConditionHeaderValue(TimeSpan.FromMilliseconds(0));
            return Task.FromResult(resp);
        }
    }

    [Fact]
    public async Task ChatAsync_JournalMode_WhenAlways429_ReturnsNappingMessage()
    {
        var sut = CreateService(new GeminiAlways429Handler(), ConfigMock(), ContextMock(), TurnMock());

        var response = await sut.ChatAsync(UserId, JournalRequest(), CancellationToken.None);

        response.Answer.Should().Be(GeminiJournalCallResult.NappingMessage);
    }

    [Fact]
    public async Task ChatAsync_JournalMode_OnSixthUserTurn_ForcesCompleteEvenWhenModelSaysContinue()
    {
        var history = new List<MiloChatHistoryMessage>();
        for (var i = 0; i < 5; i++)
        {
            history.Add(new MiloChatHistoryMessage { Role = "user", Content = $"msg{i}" });
            history.Add(new MiloChatHistoryMessage { Role = "assistant", Content = $"ack{i}" });
        }

        var inner = JsonSerializer.Serialize(new
        {
            answer = "One more check?",
            suggestedReplies = new[] { "Yes", "No" },
            status = "CONTINUE",
            summary = "",
        });
        var handler = new GeminiTestHandler { InnerTextPart = inner };
        var sut = CreateService(handler, ConfigMock(), ContextMock(), TurnMock());

        var request = JournalRequest("sixth user line");
        request.History = history;

        var response = await sut.ChatAsync(UserId, request, CancellationToken.None);

        response.JournalSessionComplete.Should().BeTrue();
        response.JournalStatus.Should().Be("COMPLETE");
        response.SuggestedReplies.Should().BeEmpty();
        response.JournalSummary.Should().Be("One more check?");
    }

    [Fact]
    public async Task ChatAsync_JournalMode_WhenAnswerIsEmergencyRedFlag_ReturnsEmergencyStopWithoutComplete()
    {
        var inner = JsonSerializer.Serialize(new
        {
            answer = ContextEngine.JournalEmergencyRedFlagToken,
            suggestedReplies = Array.Empty<string>(),
            status = "CONTINUE",
            summary = "",
        });
        var handler = new GeminiTestHandler { InnerTextPart = inner };
        var sut = CreateService(handler, ConfigMock(), ContextMock(), TurnMock());

        var response = await sut.ChatAsync(UserId, JournalRequest("yes seizure"), CancellationToken.None);

        response.JournalEmergencyStop.Should().BeTrue();
        response.JournalSessionComplete.Should().BeFalse();
        response.JournalSummary.Should().BeNull();
        response.SuggestedReplies.Should().BeEmpty();
        response.Answer.Should().Contain("emergency");
    }
}
