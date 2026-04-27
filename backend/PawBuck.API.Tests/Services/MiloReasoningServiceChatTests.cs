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

/// <summary>
/// Standard (non-journal) Milo chat: plan → facts → answer. Gemini HTTP is stubbed.
/// </summary>
public class MiloReasoningServiceChatTests
{
    private static readonly Guid UserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid PetId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    private sealed class PlanThenAnswerHandler : HttpMessageHandler
    {
        public bool SawClinicalScribePrompt { get; private set; }
        public bool SawSummaryHeaderRule { get; private set; }
        public int CallCount { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            var raw = await request.Content!.ReadAsStringAsync(cancellationToken);
            if (raw.Contains("planning module", StringComparison.Ordinal))
            {
                var planJson = JsonSerializer.Serialize(new MiloChatPlanDto
                {
                    DataNeeded = new List<string> { MiloPetFactsKinds.Vaccinations },
                    NeedsDocumentationRag = false,
                    ReasoningBrief = "user asked about shots",
                });
                return GeminiOk(planJson);
            }

            if (raw.Contains("clinical scribe", StringComparison.Ordinal) && raw.Contains("PRIMARY JOB", StringComparison.Ordinal))
                SawClinicalScribePrompt = true;
            if (raw.Contains("### Summary", StringComparison.Ordinal))
                SawSummaryHeaderRule = true;

            return GeminiOk("### Summary\n\n**Rabies** is noted in records.\n\nPlease consult your veterinarian for a professional diagnosis and before making changes to your pet's medical care. 🐕");
        }

        private static HttpResponseMessage GeminiOk(string innerText)
        {
            var json = JsonSerializer.Serialize(new
            {
                candidates = new[]
                {
                    new
                    {
                        content = new { parts = new[] { new { text = innerText } } },
                    },
                },
            });
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            };
        }
    }

    [Fact]
    public async Task ChatAsync_StandardMode_IncludesFileAttachmentsWhenPetFactsReturnsDocuments()
    {
        var handler = new PlanThenAnswerHandler();
        var petFacts = new Mock<IMiloPetFactsService>();
        petFacts.Setup(p => p.VerifyPetAccessAsync(UserId, PetId, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        petFacts.Setup(p => p.GetVaccinationsTextAsync(UserId, PetId, It.IsAny<CancellationToken>()))
            .ReturnsAsync("Vaccination Records (1 total):\n\n- Rabies\n  Date: 2024-01-01\n");
        petFacts.Setup(p => p.GetDocumentAttachmentsForPlanKindsAsync(
                UserId,
                PetId,
                It.Is<IReadOnlyList<string>>(k => k.Contains(MiloPetFactsKinds.Vaccinations)),
                5,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MiloChatFileAttachment>
            {
                new()
                {
                    Id = Guid.NewGuid().ToString("D"),
                    Kind = "vaccination",
                    Title = "Rabies",
                    StoragePath = "pet-123/vaccines/rabies.pdf",
                },
            });

        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("Gemini")).Returns(() => new HttpClient(handler, disposeHandler: true));

        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<DocumentationChunk>());

        var journalConfig = new Mock<IMiloJournalConfigProvider>();
        var context = new Mock<IPetConversationalContextService>();
        var turns = new Mock<IMiloJournalTurnService>();

        var sut = new MiloReasoningService(
            petFacts.Object,
            context.Object,
            journalConfig.Object,
            turns.Object,
            kb.Object,
            factory.Object,
            Options.Create(new GeminiOptions { ApiKey = "k", Model = "gemini-2.5-flash" }),
            Options.Create(new MiloOptions()),
            NullLogger<MiloReasoningService>.Instance);

        var response = await sut.ChatAsync(UserId, new MiloChatRequest
        {
            Message = "Is Rabies current?",
            Pet = new MiloPetContextDto
            {
                Id = PetId.ToString("D"),
                Name = "Benji",
                AnimalType = "dog",
                Breed = "Mix",
                DateOfBirth = "2020-01-01",
                Sex = "male",
                WeightValue = 10,
                WeightUnit = "kg",
            },
            History = null,
            JournalMode = false,
        }, CancellationToken.None);

        handler.SawClinicalScribePrompt.Should().BeTrue();
        handler.SawSummaryHeaderRule.Should().BeTrue();
        response.FileAttachments.Should().NotBeNull();
        var files = response.FileAttachments!;
        files.Should().HaveCount(1);
        files[0].Kind.Should().Be("vaccination");
        files[0].StoragePath.Should().Be("pet-123/vaccines/rabies.pdf");
        response.UsedPetData.Should().BeTrue();
    }

    private sealed class PlanProductHelpThenAnswerHandler : HttpMessageHandler
    {
        public bool SawProductGuidePrompt { get; private set; }
        public bool SawClinicalScribePrompt { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var raw = await request.Content!.ReadAsStringAsync(cancellationToken);
            if (raw.Contains("planning module", StringComparison.Ordinal))
            {
                var planJson = JsonSerializer.Serialize(new MiloChatPlanDto
                {
                    DataNeeded = new List<string> { MiloPetFactsKinds.None },
                    NeedsDocumentationRag = true,
                    ReasoningBrief = "product how-to",
                });
                return GeminiOk(planJson);
            }

            if (raw.Contains("PawBuck product guide", StringComparison.Ordinal))
                SawProductGuidePrompt = true;
            if (raw.Contains("clinical scribe", StringComparison.Ordinal) && raw.Contains("PRIMARY JOB", StringComparison.Ordinal))
                SawClinicalScribePrompt = true;

            return GeminiOk("### Steps\n\n1. Open Profile.\n2. Choose Manage Access.\n\n🐕");
        }

        private static HttpResponseMessage GeminiOk(string innerText)
        {
            var json = JsonSerializer.Serialize(new
            {
                candidates = new[]
                {
                    new
                    {
                        content = new { parts = new[] { new { text = innerText } } },
                    },
                },
            });
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            };
        }
    }

    [Fact]
    public async Task ChatAsync_ProductHelpWithRag_UsesProductGuidePromptNotClinicalScribe()
    {
        var handler = new PlanProductHelpThenAnswerHandler();
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("Gemini")).Returns(() => new HttpClient(handler, disposeHandler: true));

        var petFacts = new Mock<IMiloPetFactsService>();
        var kb = new Mock<IKnowledgeBaseService>();
        kb.Setup(k => k.GetContextAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DocumentationChunk>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    Content = "Family sharing: open Profile, Manage Access, invite by email.",
                    MetadataJson = "{}",
                    Similarity = 0.9,
                },
            });

        var journalConfig = new Mock<IMiloJournalConfigProvider>();
        var context = new Mock<IPetConversationalContextService>();
        var turns = new Mock<IMiloJournalTurnService>();

        var sut = new MiloReasoningService(
            petFacts.Object,
            context.Object,
            journalConfig.Object,
            turns.Object,
            kb.Object,
            factory.Object,
            Options.Create(new GeminiOptions { ApiKey = "k", Model = "gemini-2.5-flash" }),
            Options.Create(new MiloOptions()),
            NullLogger<MiloReasoningService>.Instance);

        var response = await sut.ChatAsync(UserId, new MiloChatRequest
        {
            Message = "How do I set up family sharing?",
            Pet = null,
            History = null,
            JournalMode = false,
        }, CancellationToken.None);

        handler.SawProductGuidePrompt.Should().BeTrue();
        handler.SawClinicalScribePrompt.Should().BeFalse();
        response.UsedRag.Should().BeTrue();
        response.UsedPetData.Should().BeFalse();
        response.Answer.Should().Contain("Profile");
    }
}
