using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PawBuck.API.Models;
using PawBuck.API.Services;
using PawBuck.API.Tests.MiloEval;
using PawBuck.API.Tests.Services;
using Xunit;

namespace PawBuck.API.Tests.MiloEval;

/// <summary>Live Gemini eval — skipped unless MILO_EVAL_LIVE=1 and GOOGLE_GEMINI_API_KEY are set.</summary>
[Trait("Category", "MiloEvalLive")]
public class MiloVisionEvalLiveTests
{
    [Fact]
    public async Task PreviewVaultExtraction_VaccinationFixture_ReturnsNonEmptyJson()
    {
        if (!MiloEvalLiveGate.IsEnabled)
            return;

        var fixture = MiloEvalFixtureLoader.LoadDocumentFixtures()
            .First(f => f.Id == "vac-stained-receipt-001");
        var service = CreateVisionService();

        var png = MinimalPngBytes();
        var json = await service.PreviewVaultExtractionAsync(png, "image/png", fixture.DocumentType, CancellationToken.None);
        json.Should().NotBeNullOrWhiteSpace();
    }

    private static MiloVisionService CreateVisionService()
    {
        var services = new ServiceCollection();
        services.AddHttpClient("Gemini");
        var provider = services.BuildServiceProvider();
        var httpFactory = provider.GetRequiredService<IHttpClientFactory>();
        var telemetry = new GeminiTelemetryRecorder(NullLogger<GeminiTelemetryRecorder>.Instance);
        var geminiGenerate = new GeminiGenerateContentService(
            httpFactory,
            telemetry,
            NullLogger<GeminiGenerateContentService>.Instance);

        return new MiloVisionService(
            Mock.Of<IMiloPetFactsService>(),
            Mock.Of<IMiloPromptProvider>(),
            Mock.Of<IPetDocumentClinicalSyncService>(),
            httpFactory,
            geminiGenerate,
            Options.Create(new SupabaseOptions()),
            Options.Create(new GeminiOptions
            {
                ApiKey = Environment.GetEnvironmentVariable("GOOGLE_GEMINI_API_KEY"),
                Model = Environment.GetEnvironmentVariable("GEMINI_MODEL") ?? GeminiOptions.DefaultModelId,
            }),
            Mock.Of<IMiloInteractionOutcomeRecorder>(),
            NullLogger<MiloVisionService>.Instance);
    }

    private static byte[] MinimalPngBytes() =>
        Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
}

[Trait("Category", "MiloEvalLive")]
public class MiloChatSafetyEvalLiveTests
{
    [Fact]
    public async Task ChatAsync_EmergencyChocolateScenario_PassesSafetyAssertions()
    {
        if (!MiloEvalLiveGate.IsEnabled)
            return;

        var scenario = MiloEvalFixtureLoader.LoadChatSafetyScenarios()
            .First(s => s.Id == "emergency-chocolate");
        var service = MiloEvalLiveServiceFactory.CreateReasoningService();
        var userId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var petId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

        var response = await service.ChatAsync(userId, new MiloChatRequest
        {
            Message = scenario.Prompt,
            Pet = new MiloPetContextDto { Id = petId.ToString(), Name = "Bailey" },
        }, CancellationToken.None);

        var result = MiloChatSafetyAssertions.Evaluate(response.Answer, scenario.Expect);
        result.Passed.Should().BeTrue(string.Join("; ", result.Failures));
    }
}

internal static class MiloEvalLiveGate
{
    internal static bool IsEnabled =>
        string.Equals(Environment.GetEnvironmentVariable("MILO_EVAL_LIVE"), "1", StringComparison.Ordinal) &&
        !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GOOGLE_GEMINI_API_KEY"));
}

internal static class MiloEvalLiveServiceFactory
{
    internal static MiloReasoningService CreateReasoningService()
    {
        var userId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var petId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

        var services = new ServiceCollection();
        services.AddHttpClient("Gemini");
        var provider = services.BuildServiceProvider();
        var httpFactory = provider.GetRequiredService<IHttpClientFactory>();
        var telemetry = new GeminiTelemetryRecorder(NullLogger<GeminiTelemetryRecorder>.Instance);
        var geminiGenerate = new GeminiGenerateContentService(
            httpFactory,
            telemetry,
            NullLogger<GeminiGenerateContentService>.Instance);

        var petFacts = new Mock<IMiloPetFactsService>();
        petFacts.Setup(p => p.VerifyPetAccessAsync(userId, petId, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        petFacts.Setup(p => p.GetUserPetRoleAsync(userId, petId, It.IsAny<CancellationToken>())).ReturnsAsync("owner");
        petFacts.Setup(p => p.GetVaccinationsTextAsync(userId, petId, It.IsAny<CancellationToken>())).ReturnsAsync("");
        petFacts.Setup(p => p.GetMedicationsTextAsync(userId, petId, It.IsAny<CancellationToken>())).ReturnsAsync("");
        petFacts.Setup(p => p.GetLabResultsTextAsync(userId, petId, It.IsAny<CancellationToken>())).ReturnsAsync("");
        petFacts.Setup(p => p.GetClinicalExamsTextAsync(userId, petId, It.IsAny<CancellationToken>())).ReturnsAsync("");
        petFacts.Setup(p => p.GetHealthSummaryTextAsync(userId, petId, It.IsAny<CancellationToken>())).ReturnsAsync("");

        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyList<string>>()))
            .ReturnsAsync(Array.Empty<DocumentationChunk>());

        var journalConfig = new Mock<IMiloJournalConfigProvider>();
        journalConfig.Setup(c => c.GetAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new MiloJournalConfigSnapshot());

        var context = new Mock<IPetConversationalContextService>();
        var turns = new Mock<IMiloJournalTurnService>();
        turns.Setup(t => t.RegisterTurnAsync(
                userId,
                petId,
                "general",
                It.IsAny<IReadOnlyList<string>>(),
                "general",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Guid.NewGuid());

        var treeInterview = new Mock<IJournalTreeInterviewService>();
        treeInterview.Setup(t => t.TryRunTurnAsync(
                It.IsAny<MiloChatRequest>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<MiloJournalConfigSnapshot>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((MiloChatResponse?)null);

        return new MiloReasoningService(
            petFacts.Object,
            context.Object,
            journalConfig.Object,
            turns.Object,
            treeInterview.Object,
            kb.Object,
            GeminiTestSupport.EmptyCuratedSnippets(),
            geminiGenerate,
            httpFactory,
            Options.Create(new GeminiOptions
            {
                ApiKey = Environment.GetEnvironmentVariable("GOOGLE_GEMINI_API_KEY"),
                Model = Environment.GetEnvironmentVariable("GEMINI_MODEL") ?? GeminiOptions.DefaultModelId,
            }),
            Options.Create(new MiloOptions()),
            NullLogger<MiloReasoningService>.Instance);
    }
}
