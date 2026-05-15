using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class JournalInterviewOrchestrationTests
{
    [Fact]
    public void ComputeContextScanState_WhenNoMedsOrVaccinesOnFile_FlagsBothGaps()
    {
        var ctx = new PetConversationalContextDto
        {
            PetProfile = new PetProfileSnapshot { Name = "Rex" },
            MedicationsOnFileCount = 0,
            VaccinationsOnFileCount = 0,
        };

        var scan = JournalInterviewOrchestration.ComputeContextScanState(ctx, DateTime.UtcNow);

        scan.NeedsMedicationAsk.Should().BeTrue();
        scan.NeedsVaccineAsk.Should().BeTrue();
    }

    [Fact]
    public void SanitizeSuggestedReplies_WhenMedicationQuestionHasIrrelevantChips_ReplacesWithTemplate()
    {
        var chips = JournalInterviewOrchestration.SanitizeSuggestedReplies(
            "I don't see any medicines on Rex's record. Is Rex taking any medication right now?",
            ["More energy", "Same as usual", "Worse today"]);

        chips.Should().Contain("No medications right now");
        chips.Should().Contain("Yes — daily medication(s)");
        chips.Should().Contain(JournalInterviewOrchestration.ChipNotSure);
        chips.Should().Contain(JournalInterviewOrchestration.ChipAddDetails);
    }

    [Fact]
    public void SanitizeSuggestedReplies_WhenVaccineQuestionHasIrrelevantChips_ReplacesWithTemplate()
    {
        var chips = JournalInterviewOrchestration.SanitizeSuggestedReplies(
            "I don't see vaccines on Rex's record. Has Rex had any vaccines recently?",
            ["Limping", "Vomiting", "Itchy skin"]);

        chips.Should().Contain("No recent vaccines");
        chips.Should().Contain("Yes — within the last week");
    }

    [Fact]
    public void AppendTurnDirective_OnThirdTurnWithMissingMeds_DirectsMedicationQuestionOnly()
    {
        var sb = new System.Text.StringBuilder();
        var scan = new JournalInterviewOrchestration.ContextScanState
        {
            NeedsMedicationAsk = true,
            NeedsVaccineAsk = true,
        };
        var history = new List<MiloChatHistoryMessage>
        {
            new() { Role = "user", Content = "Lethargic today" },
            new() { Role = "assistant", Content = "When did you first notice?" },
            new() { Role = "user", Content = "This morning" },
            new() { Role = "assistant", Content = "How is appetite?" },
        };

        JournalInterviewOrchestration.AppendTurnDirective(sb, scan, history, userTurnNumber: 3, "Rex");

        sb.ToString().Should().Contain("Medications ONLY");
        sb.ToString().Should().NotContain("Vaccines ONLY");
    }

    [Fact]
    public void AppendTurnDirective_OnFourthTurnAfterMedsAsked_DirectsVaccineQuestionOnly()
    {
        var sb = new System.Text.StringBuilder();
        var scan = new JournalInterviewOrchestration.ContextScanState
        {
            NeedsMedicationAsk = true,
            NeedsVaccineAsk = true,
        };
        var history = new List<MiloChatHistoryMessage>
        {
            new() { Role = "user", Content = "Lethargic today" },
            new() { Role = "assistant", Content = "When did you first notice?" },
            new() { Role = "user", Content = "This morning" },
            new()
            {
                Role = "assistant",
                Content = "I don't see any medicines on Rex's record. Is Rex taking any medication right now?",
            },
            new() { Role = "user", Content = "No medications right now" },
        };

        JournalInterviewOrchestration.AppendTurnDirective(sb, scan, history, userTurnNumber: 4, "Rex");

        sb.ToString().Should().Contain("Vaccines ONLY");
        sb.ToString().Should().NotContain("Medications ONLY");
    }
}
