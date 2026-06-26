using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloInteractionOutcomeClassifierTests
{
    private static readonly Guid UserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid PetId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly Guid DocumentId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");

    [Fact]
    public void ClassifyChat_SuccessfulAnswer_ReturnsSuccess()
    {
        var insert = MiloInteractionOutcomeClassifier.ClassifyChat(
            UserId,
            new MiloChatRequest { Message = "What vaccines does my dog need?", Pet = new MiloPetContextDto { Id = PetId.ToString() } },
            new MiloChatResponse { Answer = "Core vaccines include rabies and DHPP.", UsedRag = true },
            "gemini-2.0-flash");

        insert.Outcome.Should().Be(MiloInteractionOutcomes.Success);
        insert.FailureCode.Should().BeNull();
        insert.Surface.Should().Be(MiloInteractionSurfaces.Chat);
        insert.UsedRag.Should().BeTrue();
        insert.PetId.Should().Be(PetId);
    }

    [Fact]
    public void ClassifyChat_JournalEmergencyStop_ReturnsPartial()
    {
        var insert = MiloInteractionOutcomeClassifier.ClassifyChat(
            UserId,
            new MiloChatRequest { Message = "My dog ate chocolate", JournalMode = true },
            new MiloChatResponse { Answer = "Seek emergency care immediately.", JournalEmergencyStop = true },
            "gemini-2.0-flash");

        insert.Outcome.Should().Be(MiloInteractionOutcomes.Partial);
        insert.FailureCode.Should().Be(MiloInteractionFailureCodes.JournalEmergencyStop);
        insert.Surface.Should().Be(MiloInteractionSurfaces.Journal);
        insert.JournalEmergencyStop.Should().BeTrue();
    }

    [Fact]
    public void ClassifyChat_UnhandledException_ReturnsFailed()
    {
        var insert = MiloInteractionOutcomeClassifier.ClassifyChat(
            UserId,
            new MiloChatRequest { Message = "Hello" },
            new MiloChatResponse { Answer = "fallback" },
            "gemini-2.0-flash",
            unhandledException: "InvalidOperationException");

        insert.Outcome.Should().Be(MiloInteractionOutcomes.Failed);
        insert.FailureCode.Should().Be(MiloInteractionFailureCodes.UnhandledException);
        insert.Metadata.Should().ContainKey("exception");
    }

    [Fact]
    public void ClassifyVision_IrrelevantType_ReturnsFailedWrongType()
    {
        var insert = MiloInteractionOutcomeClassifier.ClassifyVision(
            UserId,
            PetId,
            DocumentId,
            MiloInteractionSurfaces.Vision,
            "irrelevant",
            90,
            95,
            """{"items":[]}""",
            "gemini-2.0-flash",
            null);

        insert.Outcome.Should().Be(MiloInteractionOutcomes.Failed);
        insert.FailureCode.Should().Be(MiloInteractionFailureCodes.VisionWrongType);
    }

    [Fact]
    public void ClassifyVision_EmptyVaccinationItems_ReturnsFailedEmptyItems()
    {
        var insert = MiloInteractionOutcomeClassifier.ClassifyVision(
            UserId,
            PetId,
            DocumentId,
            MiloInteractionSurfaces.Vision,
            "vaccinations",
            80,
            90,
            """{"items":[]}""",
            "gemini-2.0-flash",
            null);

        insert.Outcome.Should().Be(MiloInteractionOutcomes.Failed);
        insert.FailureCode.Should().Be(MiloInteractionFailureCodes.VisionEmptyItems);
    }

    [Fact]
    public void ClassifyVision_LowClassifyConfidence_ReturnsPartial()
    {
        var insert = MiloInteractionOutcomeClassifier.ClassifyVision(
            UserId,
            PetId,
            DocumentId,
            MiloInteractionSurfaces.Vision,
            "lab_results",
            80,
            55,
            """{"items":[{"name":"CBC"}]}""",
            "gemini-2.0-flash",
            null);

        insert.Outcome.Should().Be(MiloInteractionOutcomes.Partial);
        insert.FailureCode.Should().Be(MiloInteractionFailureCodes.VisionClassifyLowConfidence);
    }

    [Fact]
    public void ResolveVisionSurface_EmailSource_ReturnsEmailVault()
    {
        MiloInteractionOutcomeClassifier.ResolveVisionSurface("email_attachment")
            .Should().Be(MiloInteractionSurfaces.EmailVault);
        MiloInteractionOutcomeClassifier.ResolveVisionSurface(null)
            .Should().Be(MiloInteractionSurfaces.Vision);
    }
}
