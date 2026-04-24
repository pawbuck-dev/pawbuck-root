using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class ContextEngineTests
{
    [Fact]
    public void EvaluateHeuristicGuidance_PostVaccineWithinWindow_AddsTag()
    {
        var config = MiloJournalConfigSnapshot.Defaults();
        var utc = new DateTime(2025, 6, 10, 12, 0, 0, DateTimeKind.Utc);
        var ctx = new PetConversationalContextDto
        {
            PetProfile = new PetProfileSnapshot { Name = "Ace", IsSenior = false },
            RecentMedicalHistory =
            {
                new RecentMedicalEvent { Type = "vaccination", Name = "Rabies", Date = "2025-06-08" },
            },
        };

        var (_, tags) = ContextEngine.EvaluateHeuristicGuidance(ctx, config, utc);

        tags.Should().Contain(ContextEngine.TagPostVaccine);
    }

    [Fact]
    public void EvaluateHeuristicGuidance_LimpingInRecentJournal_AddsTag()
    {
        var config = MiloJournalConfigSnapshot.Defaults();
        var utc = new DateTime(2025, 6, 10, 12, 0, 0, DateTimeKind.Utc);
        var ctx = new PetConversationalContextDto
        {
            PetProfile = new PetProfileSnapshot { Name = "Ace", IsSenior = false },
            RecentJournalNotes =
            {
                new RecentJournalNote
                {
                    Domain = "health",
                    Subtype = "walk",
                    Note = "Seems to be limping on the back leg",
                    EntryDate = "2025-06-10",
                    CreatedAt = utc.ToString("o"),
                },
            },
        };

        var (_, tags) = ContextEngine.EvaluateHeuristicGuidance(ctx, config, utc);

        tags.Should().Contain(ContextEngine.TagLimping);
    }

    [Fact]
    public void HasMedicalEventWithinLastDays_WhenEventThreeDaysAgo_ReturnsTrue()
    {
        var utc = new DateTime(2025, 6, 10, 12, 0, 0, DateTimeKind.Utc);
        var ctx = new PetConversationalContextDto
        {
            PetProfile = new PetProfileSnapshot { Name = "Ace" },
            RecentMedicalHistory =
            {
                new RecentMedicalEvent { Type = "clinical_exam", Name = "Checkup", Date = "2025-06-07" },
            },
        };

        ContextEngine.HasMedicalEventWithinLastDays(ctx, 7, utc).Should().BeTrue();
    }

    [Fact]
    public void HasMedicalEventWithinLastDays_WhenOldestEventOutsideWindow_ReturnsFalse()
    {
        var utc = new DateTime(2025, 6, 10, 12, 0, 0, DateTimeKind.Utc);
        var ctx = new PetConversationalContextDto
        {
            PetProfile = new PetProfileSnapshot { Name = "Ace" },
            RecentMedicalHistory =
            {
                new RecentMedicalEvent { Type = "vaccination", Name = "Rabies", Date = "2025-05-01" },
            },
        };

        ContextEngine.HasMedicalEventWithinLastDays(ctx, 7, utc).Should().BeFalse();
    }

    [Fact]
    public void EvaluateHeuristicGuidance_SeniorQuietJournal_AddsTag()
    {
        var config = MiloJournalConfigSnapshot.Defaults();
        var utc = new DateTime(2025, 6, 10, 12, 0, 0, DateTimeKind.Utc);
        var ctx = new PetConversationalContextDto
        {
            PetProfile = new PetProfileSnapshot { Name = "Ace", IsSenior = true },
            RecentJournalNotes =
            {
                new RecentJournalNote
                {
                    Domain = "health",
                    Subtype = "note",
                    Note = "Old",
                    EntryDate = "2025-05-01",
                    CreatedAt = new DateTime(2025, 5, 1, 12, 0, 0, DateTimeKind.Utc).ToString("o"),
                },
            },
        };

        var (_, tags) = ContextEngine.EvaluateHeuristicGuidance(ctx, config, utc);

        tags.Should().Contain(ContextEngine.TagSeniorQuiet);
    }

    [Fact]
    public void BuildJournalSystemPersonaPrompt_ContainsSeniorScribeClinicalAbstractRules()
    {
        var prompt = ContextEngine.BuildJournalSystemPersonaPrompt(
            "Rex",
            MiloJournalConfigSnapshot.Defaults(),
            [],
            [],
            userTurnNumber: 1);

        prompt.Should().Contain("Senior Veterinary Scribe");
        prompt.Should().Contain("Clinical Abstract");
        prompt.Should().Contain("Adipsia");
        prompt.Should().Contain("[URGENT]");
        prompt.Should().Contain("[CRITICAL]");
        prompt.Should().Contain("no bullet points");
    }

    [Fact]
    public void MiloJournalConfigSnapshot_Merge_RespectsOverrides()
    {
        var merged = MiloJournalConfigSnapshot.Merge(new MiloJournalConfigSnapshot
        {
            PostVaccineFocusDays = 5,
            PromptVersion = "v2-test",
        });
        merged.PostVaccineFocusDays.Should().Be(5);
        merged.PromptVersion.Should().Be("v2-test");
        merged.RecentMedicalWindowDays.Should().Be(14);
    }
}
