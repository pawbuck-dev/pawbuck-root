using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class SupportMiloJournalControllerTests
{
    private static readonly Guid UserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid PetId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly Guid OtherUserId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");

    private static SupportMiloJournalController CreateController(
        out Mock<IMiloJournalConfigAdminService> configMock,
        out Mock<IMiloJournalFeedbackAggregateService> aggregatesMock,
        out Mock<IMiloReasoningService> reasoningMock,
        out Mock<ISupportDirectoryService> directoryMock)
    {
        configMock = new Mock<IMiloJournalConfigAdminService>();
        aggregatesMock = new Mock<IMiloJournalFeedbackAggregateService>();
        reasoningMock = new Mock<IMiloReasoningService>();
        directoryMock = new Mock<ISupportDirectoryService>();
        return new SupportMiloJournalController(
            configMock.Object,
            aggregatesMock.Object,
            reasoningMock.Object,
            directoryMock.Object,
            NullLogger<SupportMiloJournalController>.Instance);
    }

    [Fact]
    public async Task ChatSmoke_WhenPetNotFound_ReturnsNotFound()
    {
        var controller = CreateController(out _, out _, out var reasoning, out var directory);
        directory.Setup(d => d.GetPetByIdAsync(PetId, It.IsAny<CancellationToken>())).ReturnsAsync((SupportPetRow?)null);

        var result = await controller.ChatSmoke(
            new MiloJournalChatSmokeRequest { UserId = UserId, PetId = PetId, Message = "Hello" },
            CancellationToken.None);

        result.Result.Should().BeOfType<NotFoundObjectResult>();
        reasoning.Verify(
            r => r.ChatAsync(It.IsAny<Guid>(), It.IsAny<MiloChatRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ChatSmoke_WhenPetBelongsToAnotherUser_ReturnsBadRequest()
    {
        var controller = CreateController(out _, out _, out var reasoning, out var directory);
        directory.Setup(d => d.GetPetByIdAsync(PetId, It.IsAny<CancellationToken>())).ReturnsAsync(new SupportPetRow
        {
            Id = PetId,
            UserId = OtherUserId,
            Name = "X",
            Breed = "",
            AnimalType = "dog",
            DateOfBirth = DateTime.UtcNow.Date,
            Sex = "unknown",
            CreatedAt = DateTimeOffset.UtcNow,
        });

        var result = await controller.ChatSmoke(
            new MiloJournalChatSmokeRequest { UserId = UserId, PetId = PetId, Message = "Hello" },
            CancellationToken.None);

        var bad = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        bad.Value.Should().NotBeNull();
        reasoning.Verify(
            r => r.ChatAsync(It.IsAny<Guid>(), It.IsAny<MiloChatRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ChatSmoke_WhenValid_ReturnsOkAndCallsReasoning()
    {
        var controller = CreateController(out _, out _, out var reasoning, out var directory);
        directory.Setup(d => d.GetPetByIdAsync(PetId, It.IsAny<CancellationToken>())).ReturnsAsync(new SupportPetRow
        {
            Id = PetId,
            UserId = UserId,
            Name = "Rex",
            Breed = "Lab",
            AnimalType = "dog",
            DateOfBirth = new DateTime(2020, 1, 15, 0, 0, 0, DateTimeKind.Utc),
            Sex = "male",
            CreatedAt = DateTimeOffset.UtcNow,
        });

        var expected = new MiloChatResponse { Answer = "Hi!", PetName = "Rex" };
        reasoning
            .Setup(r => r.ChatAsync(UserId, It.IsAny<MiloChatRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await controller.ChatSmoke(
            new MiloJournalChatSmokeRequest
            {
                UserId = UserId,
                PetId = PetId,
                Message = "How are you?",
                JournalMode = true,
            },
            CancellationToken.None);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<MiloChatResponse>().Subject;
        body.Answer.Should().Be("Hi!");

        reasoning.Verify(
            r => r.ChatAsync(
                UserId,
                It.Is<MiloChatRequest>(req =>
                    req.Message == "How are you?" &&
                    req.JournalMode &&
                    req.Pet != null &&
                    req.Pet.Id == PetId.ToString() &&
                    req.Pet.Name == "Rex"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ChatSmoke_WhenMessageEmpty_ReturnsBadRequest()
    {
        var controller = CreateController(out _, out _, out var reasoning, out var directory);

        var result = await controller.ChatSmoke(
            new MiloJournalChatSmokeRequest { UserId = UserId, PetId = PetId, Message = "   " },
            CancellationToken.None);

        result.Result.Should().BeOfType<BadRequestObjectResult>();
        directory.Verify(d => d.GetPetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        reasoning.Verify(
            r => r.ChatAsync(It.IsAny<Guid>(), It.IsAny<MiloChatRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
