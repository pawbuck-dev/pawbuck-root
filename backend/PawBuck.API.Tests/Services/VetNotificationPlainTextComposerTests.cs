using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class VetNotificationPlainTextComposerTests
{
    [Fact]
    public void Compose_UsesPlainText_NoMarkdownStarsInBody()
    {
        var body = new MiloVetNotificationDraftRequest
        {
            PetName = "Pawsome",
            Breed = "Malamute",
            DateOfBirth = "2022-01-15",
            Sex = "male",
            WeightValue = 32,
            WeightUnit = "kg",
            EmailId = "pawsome2",
            UserTurns = new List<string> { "Watery stool" },
            JournalSummary = "**Observations:** soft stool.",
            OwnerSigningName = "Alex",
            SessionDateLabel = "May 10, 2026",
            Severity = "medium",
        };
        var (subject, text) = VetNotificationPlainTextComposer.Compose(body);
        text.Should().NotContain("**");
        subject.Should().NotContain("!");
        text.Should().Contain("Alex");
        text.Should().Contain("sent via PawBuck");
        text.Should().NotContain("Best regards");
    }

    [Fact]
    public void VetMedicalContextMapper_BuildsLinesFromRecentEvents()
    {
        var ctx = new PetConversationalContextDto
        {
            RecentMedicalHistory =
            {
                new RecentMedicalEvent
                {
                    Type = "vaccination",
                    Name = "Rabies",
                    Date = "2025-11-01",
                    Details = "Clinic A",
                },
            },
        };
        var dto = VetMedicalContextMapper.FromPetContext(ctx);
        dto.Should().NotBeNull();
        dto!.LastVisitDate.Should().Be("2025-11-01");
        dto.VaccinesDetail.Should().Contain("Rabies");
    }
}
