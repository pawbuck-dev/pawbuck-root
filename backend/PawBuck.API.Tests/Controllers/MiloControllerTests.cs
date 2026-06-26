using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PawBuck.API;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Tests.Services;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class MiloControllerTests
{
    private static readonly Guid UserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid PetId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly Guid SessionId = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");
    private static readonly Guid TurnId = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");

    private static MiloController CreateController(
        out Mock<IMiloReasoningService> reasoning,
        out Mock<IMiloCuratedSnippetsService> curated,
        out Mock<IUserEntitlementService> entitlements,
        out Mock<ISubscriptionFeatureGateService> featureGates,
        out Mock<IMiloJournalTurnService> journalTurns,
        out Mock<IJournalTreeInterviewService> journalTree,
        MiloRagService? ragService = null,
        IOptions<MiloOptions>? miloOptions = null,
        IWebHostEnvironment? environment = null,
        IOptions<SubscriptionOptions>? subscriptionOptions = null)
    {
        reasoning = new Mock<IMiloReasoningService>();
        curated = new Mock<IMiloCuratedSnippetsService>();
        entitlements = new Mock<IUserEntitlementService>();
        featureGates = new Mock<ISubscriptionFeatureGateService>();
        journalTurns = new Mock<IMiloJournalTurnService>();
        journalTree = new Mock<IJournalTreeInterviewService>();

        featureGates
            .Setup(f => f.IsPremiumRequiredForFeatureAsync(SubscriptionFeatureKeys.MiloChat, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        entitlements
            .Setup(e => e.HasActivePremiumAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        ragService ??= CreateRagServiceWithEmptyKb();

        return new MiloController(
            ragService,
            reasoning.Object,
            curated.Object,
            miloOptions ?? Options.Create(new MiloOptions()),
            environment ?? CreateEnvironment(isDevelopment: false),
            NullLogger<MiloController>.Instance,
            entitlements.Object,
            featureGates.Object,
            subscriptionOptions ?? Options.Create(new SubscriptionOptions()),
            journalTurns.Object,
            journalTree.Object)
        {
            ControllerContext = CreateAuthContext(UserId),
        };
    }

    private static ControllerContext CreateAuthContext(Guid? userId = null)
    {
        var claims = userId.HasValue
            ? new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString())],
                "Test")
            : new ClaimsIdentity([], "Test");
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(claims) },
        };
    }

    private static IWebHostEnvironment CreateEnvironment(bool isDevelopment)
    {
        var env = new Mock<IWebHostEnvironment>();
        env.Setup(e => e.EnvironmentName).Returns(isDevelopment ? Environments.Development : Environments.Production);
        return env.Object;
    }

    private static MiloRagService CreateRagServiceWithEmptyKb()
    {
        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>(),
                It.IsAny<IReadOnlyList<string>?>()))
            .ReturnsAsync(Array.Empty<DocumentationChunk>());

        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("Gemini")).Returns(() => new HttpClient(new StubHandler(), disposeHandler: true));

        return new MiloRagService(
            kb.Object,
            GeminiTestSupport.CreateGenerateService(new StubHandler()),
            Options.Create(new GeminiOptions { ApiKey = "test-key" }),
            NullLogger<MiloRagService>.Instance);
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(new
                    {
                        candidates = new[]
                        {
                            new { content = new { parts = new[] { new { text = "FAQ answer" } } } },
                        },
                    }),
                    Encoding.UTF8,
                    "application/json"),
            });
    }

    // --- POST chat ---

    [Fact]
    public async Task Chat_Returns400_WhenMessageEmpty()
    {
        var controller = CreateController(out var reasoning, out _, out _, out _, out _, out _);

        var result = await controller.Chat(new MiloChatRequest { Message = "  " }, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        reasoning.Verify(
            r => r.ChatAsync(It.IsAny<Guid>(), It.IsAny<MiloChatRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Chat_Returns401_WhenUserIdMissing()
    {
        var controller = CreateController(out var reasoning, out _, out _, out _, out _, out _);
        controller.ControllerContext = CreateAuthContext(null);

        var result = await controller.Chat(new MiloChatRequest { Message = "Hi" }, CancellationToken.None);

        result.Should().BeOfType<UnauthorizedResult>();
        reasoning.Verify(
            r => r.ChatAsync(It.IsAny<Guid>(), It.IsAny<MiloChatRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Chat_Returns402_WhenPremiumRequiredAndNotEntitled()
    {
        var controller = CreateController(
            out var reasoning,
            out _,
            out var entitlements,
            out _,
            out _,
            out _,
            subscriptionOptions: Options.Create(new SubscriptionOptions { RequirePremiumForMilo = true }));
        entitlements
            .Setup(e => e.HasActivePremiumAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await controller.Chat(new MiloChatRequest { Message = "Hi" }, CancellationToken.None);

        var status = result.Should().BeOfType<ObjectResult>().Subject;
        status.StatusCode.Should().Be(StatusCodes.Status402PaymentRequired);
        reasoning.Verify(
            r => r.ChatAsync(It.IsAny<Guid>(), It.IsAny<MiloChatRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Chat_Returns402_WhenMiloConversationCapExceeded()
    {
        var controller = CreateController(
            out var reasoning,
            out _,
            out var entitlements,
            out _,
            out _,
            out _,
            subscriptionOptions: Options.Create(new SubscriptionOptions { EnforceMiloConversationCap = true }));
        entitlements
            .Setup(e => e.AssertMiloConversationAllowedAsync(UserId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new SubscriptionLimitException("milo_conversation_cap", SubscriptionPlans.Individual,
                "Milo conversation limit reached (3 lifetime). Upgrade to Individual for unlimited Milo."));

        var result = await controller.Chat(new MiloChatRequest { Message = "Hi" }, CancellationToken.None);

        var status = result.Should().BeOfType<ObjectResult>().Subject;
        status.StatusCode.Should().Be(StatusCodes.Status402PaymentRequired);
        reasoning.Verify(
            r => r.ChatAsync(It.IsAny<Guid>(), It.IsAny<MiloChatRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Chat_Returns402_WhenAiJournalCapExceededOnNewSession()
    {
        var controller = CreateController(
            out var reasoning,
            out _,
            out var entitlements,
            out _,
            out _,
            out _,
            subscriptionOptions: Options.Create(new SubscriptionOptions { EnforceAiJournalCap = true }));
        entitlements
            .Setup(e => e.AssertAiJournalAllowedAsync(UserId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new SubscriptionLimitException("ai_journal_entry_cap", SubscriptionPlans.Individual,
                "AI journal entry limit reached (2 lifetime). Upgrade to Individual for unlimited entries."));

        var result = await controller.Chat(
            new MiloChatRequest { Message = "My dog is limping", JournalMode = true },
            CancellationToken.None);

        var status = result.Should().BeOfType<ObjectResult>().Subject;
        status.StatusCode.Should().Be(StatusCodes.Status402PaymentRequired);
        reasoning.Verify(
            r => r.ChatAsync(It.IsAny<Guid>(), It.IsAny<MiloChatRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Chat_Returns200_WhenValid()
    {
        var controller = CreateController(out var reasoning, out _, out _, out _, out _, out _);
        var expected = new MiloChatResponse { Answer = "Hello!", PetName = "Rex" };
        reasoning
            .Setup(r => r.ChatAsync(UserId, It.IsAny<MiloChatRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await controller.Chat(new MiloChatRequest { Message = "Hi" }, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<MiloChatResponse>().Which.Answer.Should().Be("Hello!");
    }

    [Fact]
    public async Task Chat_Returns500FriendlyMessage_WhenReasoningThrows()
    {
        var controller = CreateController(out var reasoning, out _, out _, out _, out _, out _);
        reasoning
            .Setup(r => r.ChatAsync(It.IsAny<Guid>(), It.IsAny<MiloChatRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        var result = await controller.Chat(
            new MiloChatRequest { Message = "Hi", Pet = new MiloPetContextDto { Name = "Rex" } },
            CancellationToken.None);

        var status = result.Should().BeOfType<ObjectResult>().Subject;
        status.StatusCode.Should().Be(500);
        var body = status.Value.Should().BeOfType<MiloChatResponse>().Subject;
        body.Answer.Should().Contain("Something went wrong");
        body.PetName.Should().Be("Rex");
    }

    // --- POST chat/feedback ---

    [Fact]
    public async Task PostJournalFeedback_Returns400_WhenBodyNull()
    {
        var controller = CreateController(out _, out _, out _, out _, out var turns, out _);

        var result = await controller.PostJournalFeedback(null, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        turns.Verify(
            t => t.TrySubmitFeedbackAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task PostJournalFeedback_Returns400_WhenTurnIdMissing()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out _);

        var result = await controller.PostJournalFeedback(
            new MiloJournalFeedbackRequest { Rating = "up" },
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task PostJournalFeedback_Returns400_WhenRatingInvalid()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out _);

        var result = await controller.PostJournalFeedback(
            new MiloJournalFeedbackRequest { ResponseId = TurnId, Rating = "maybe" },
            CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task PostJournalFeedback_Returns404_WhenTurnNotFound()
    {
        var controller = CreateController(out _, out _, out _, out _, out var turns, out _);
        turns
            .Setup(t => t.TrySubmitFeedbackAsync(UserId, TurnId, "up", It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await controller.PostJournalFeedback(
            new MiloJournalFeedbackRequest { ResponseId = TurnId, Rating = "up" },
            CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task PostJournalFeedback_Returns200_WhenResponseIdProvided()
    {
        var controller = CreateController(out _, out _, out _, out _, out var turns, out _);
        turns
            .Setup(t => t.TrySubmitFeedbackAsync(UserId, TurnId, "down", "too long", "1.5.0", 3, "complete", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await controller.PostJournalFeedback(
            new MiloJournalFeedbackRequest
            {
                ResponseId = TurnId,
                Rating = "down",
                FeedbackReason = "too long",
                TreeVersion = "1.5.0",
                QuestionsAsked = 3,
                FeedbackStage = "complete",
            },
            CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task PostJournalFeedback_AcceptsStringTurnId()
    {
        var controller = CreateController(out _, out _, out _, out _, out var turns, out _);
        turns
            .Setup(t => t.TrySubmitFeedbackAsync(UserId, TurnId, "up", null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await controller.PostJournalFeedback(
            new MiloJournalFeedbackRequest { TurnId = TurnId.ToString("D"), Rating = "up" },
            CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    // --- POST ask ---

    [Fact]
    public async Task Ask_Returns400_WhenQuestionNull()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out _);

        var result = await controller.Ask(null!, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Ask_Returns400_WhenQuestionEmpty()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out _);

        var result = await controller.Ask(new MiloAskRequest { Question = "   " }, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Ask_Returns200_WithGeneralHelp_WhenNoKbContext()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out _);

        var result = await controller.Ask(new MiloAskRequest { Question = "How do I upload vaccines?" }, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<MiloQueryResponse>().Subject;
        body.IsGeneralHelp.Should().BeTrue();
        body.UsedContext.Should().BeFalse();
    }

    // --- journal sessions ---

    [Fact]
    public async Task GetActiveJournalSession_Returns400_WhenPetIdEmpty()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out _);

        var result = await controller.GetActiveJournalSession(Guid.Empty, CancellationToken.None);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GetActiveJournalSession_Returns404_WhenNoSession()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out var tree);
        tree.Setup(t => t.GetActiveSessionAsync(UserId, PetId, It.IsAny<CancellationToken>())).ReturnsAsync((JournalActiveSessionDto?)null);

        var result = await controller.GetActiveJournalSession(PetId, CancellationToken.None);

        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetActiveJournalSession_Returns200_WhenSessionExists()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out var tree);
        var session = new JournalActiveSessionDto { SessionId = SessionId, TreeId = "cough_v1.5", Phase = "question" };
        tree.Setup(t => t.GetActiveSessionAsync(UserId, PetId, It.IsAny<CancellationToken>())).ReturnsAsync(session);

        var result = await controller.GetActiveJournalSession(PetId, CancellationToken.None);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<JournalActiveSessionDto>().Which.SessionId.Should().Be(SessionId);
    }

    [Fact]
    public async Task LinkJournalSessionEntry_Returns400_WhenBodyMissing()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out _);

        var result = await controller.LinkJournalSessionEntry(SessionId, null, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task LinkJournalSessionEntry_Returns404_WhenNotLinkable()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out var tree);
        tree
            .Setup(t => t.LinkSessionToJournalEntryAsync(UserId, PetId, SessionId, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await controller.LinkJournalSessionEntry(
            SessionId,
            new LinkJournalEntryRequest { PetId = PetId, JournalEntryId = Guid.NewGuid() },
            CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task LinkJournalSessionEntry_Returns200_WhenLinked()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out var tree);
        var entryId = Guid.NewGuid();
        tree
            .Setup(t => t.LinkSessionToJournalEntryAsync(UserId, PetId, SessionId, entryId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await controller.LinkJournalSessionEntry(
            SessionId,
            new LinkJournalEntryRequest { PetId = PetId, JournalEntryId = entryId },
            CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    // --- vet-notification-draft ---

    [Fact]
    public void VetNotificationDraft_Returns400_WhenBodyNull()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out _);

        var result = controller.VetNotificationDraft(null);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public void VetNotificationDraft_Returns200_WithSubjectAndBody()
    {
        var controller = CreateController(out _, out _, out _, out _, out _, out _);

        var result = controller.VetNotificationDraft(new MiloVetNotificationDraftRequest
        {
            PetName = "Rex",
            OwnerSigningName = "Alex",
            JournalSummary = "Coughing since yesterday",
        });

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<MiloVetNotificationDraftResponse>().Subject;
        body.Subject.Should().NotBeNullOrWhiteSpace();
        body.Body.Should().Contain("Rex");
    }

    // --- curated-guidance ---

    [Fact]
    public async Task CuratedGuidance_Returns503_WhenKeyUnsetOutsideDevelopment()
    {
        var controller = CreateController(
            out _, out _, out _, out _, out _, out _,
            miloOptions: Options.Create(new MiloOptions { InternalServiceKey = null }),
            environment: CreateEnvironment(isDevelopment: false));

        var result = await controller.CuratedGuidance(null, null, null, null, CancellationToken.None);

        var status = result.Should().BeOfType<ObjectResult>().Subject;
        status.StatusCode.Should().Be(StatusCodes.Status503ServiceUnavailable);
    }

    [Fact]
    public async Task CuratedGuidance_Returns401_WhenKeyWrong()
    {
        var controller = CreateController(
            out _, out _, out _, out _, out _, out _,
            miloOptions: Options.Create(new MiloOptions { InternalServiceKey = "secret" }),
            environment: CreateEnvironment(isDevelopment: false));

        var result = await controller.CuratedGuidance("wrong", "Lab", "dog", null, CancellationToken.None);

        result.Should().BeOfType<UnauthorizedResult>();
    }

    [Fact]
    public async Task CuratedGuidance_Returns200_WhenKeyValid()
    {
        var controller = CreateController(
            out _, out var curated, out _, out _, out _, out _,
            miloOptions: Options.Create(new MiloOptions { InternalServiceKey = "secret" }),
            environment: CreateEnvironment(isDevelopment: false));
        curated
            .Setup(c => c.GetGuidanceAsync("Lab", "dog", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MiloCuratedSnippetDto> { new() { Topic = "general", Content = "Tip" } });

        var result = await controller.CuratedGuidance("secret", "Lab", "dog", null, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeAssignableTo<IReadOnlyList<MiloCuratedSnippetDto>>();
    }
}
