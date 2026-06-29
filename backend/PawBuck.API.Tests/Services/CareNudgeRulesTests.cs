using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class CareNudgeRulesTests
{
    [Fact]
    public void BuildForPet_ExcludesOlderDuplicateNameRows_FromOverdue()
    {
        var petId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var input = new CareNudgePetInput
        {
            PetId = petId,
            UserId = Guid.NewGuid(),
            PetName = "Milo",
            Vaccinations =
            [
                new CareNudgeVaccinationInput
                {
                    Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                    Name = "Rabies",
                    Date = "2020-01-01",
                    NextDueDate = "2024-01-01",
                },
                new CareNudgeVaccinationInput
                {
                    Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd"),
                    Name = "Rabies",
                    Date = "2024-06-01",
                    NextDueDate = "2026-07-15",
                },
                new CareNudgeVaccinationInput
                {
                    Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
                    Name = "DAPP",
                    Date = "2025-10-11",
                    NextDueDate = "2026-06-20",
                },
            ],
        };

        var nudges = CareNudgeRules.BuildForPet(input, new DateTime(2026, 6, 29, 12, 0, 0, DateTimeKind.Utc));
        nudges.Should().Contain(n => n.Kind == "vac_overdue" && n.EvidenceId == Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"));
        nudges.Should().NotContain(n => n.EvidenceId == Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"));
    }

    [Fact]
    public void BuildDailyDigest_GroupsMultiplePets()
    {
        var userId = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");
        var nudges = new List<CareNudgeDto>
        {
            new()
            {
                Kind = "vac_overdue",
                DedupeKey = "a",
                PetId = Guid.NewGuid(),
                PetName = "Milo",
                Priority = 10,
                Title = "Rabies overdue",
                Body = "body",
                DeepLink = "/",
                Channels = ["push"],
            },
            new()
            {
                Kind = "vac_overdue",
                DedupeKey = "b",
                PetId = Guid.NewGuid(),
                PetName = "Benji",
                Priority = 10,
                Title = "DAPP overdue",
                Body = "body",
                DeepLink = "/",
                Channels = ["push"],
            },
        };

        var digest = CareNudgeRules.BuildDailyDigest(nudges, userId, new DateTime(2026, 6, 29, 9, 0, 0, DateTimeKind.Utc));
        digest.Should().NotBeNull();
        digest!.Title.Should().Contain("2 pets");
        digest.DedupeKey.Should().Be($"digest:{userId}:2026-06-29");
    }

    [Fact]
    public void ApplyDismissals_SuppressesUntilDate()
    {
        var petId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var nudges = new List<CareNudgeDto>
        {
            new()
            {
                Kind = "vac_overdue",
                DedupeKey = "a",
                PetId = petId,
                Priority = 10,
                Title = "Rabies overdue",
                Body = "body",
                DeepLink = "/",
                Channels = ["push"],
            },
        };

        var filtered = CareNudgeRules.ApplyDismissals(
            nudges,
            [new CareNudgeDismissalRow { PetId = petId, NudgeKind = "vac_overdue", DismissedUntil = new DateOnly(2026, 7, 5) }],
            new DateOnly(2026, 6, 29));

        filtered.Should().BeEmpty();
    }
}
