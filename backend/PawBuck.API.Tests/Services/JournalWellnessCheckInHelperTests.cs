using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class JournalWellnessCheckInHelperTests
{
    private static readonly DateTime UtcNow = new(2026, 6, 13, 15, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void BuildTopicPickerChips_omits_all_good_without_recent_issues()
    {
        var ctx = new PetConversationalContextDto();
        var chips = JournalWellnessCheckInHelper.BuildTopicPickerChips(ctx, UtcNow);
        chips.Should().NotContain(JournalWellnessCheckInHelper.AllGoodTodayChip);
        chips.Should().Contain("Vomiting or diarrhea");
    }

    [Fact]
    public void BuildTopicPickerChips_includes_all_good_after_recent_symptom()
    {
        var ctx = new PetConversationalContextDto
        {
            RecentJournalNotes =
            [
                new RecentJournalNote
                {
                    Domain = "health",
                    Subtype = "symptom",
                    Note = "Vomiting twice yesterday",
                    EntryDate = "2026-06-12",
                    CreatedAt = "2026-06-12T18:00:00Z",
                },
            ],
        };

        var chips = JournalWellnessCheckInHelper.BuildTopicPickerChips(ctx, UtcNow);
        chips[0].Should().Be(JournalWellnessCheckInHelper.AllGoodTodayChip);
    }

    [Fact]
    public void TryBuildAllGoodTodayResponse_tracks_issue_duration()
    {
        var ctx = new PetConversationalContextDto
        {
            RecentJournalNotes =
            [
                new RecentJournalNote
                {
                    Domain = "health",
                    Subtype = "symptom",
                    Note = "Lethargic and off food",
                    EntryDate = "2026-06-11",
                    CreatedAt = "2026-06-11T18:00:00Z",
                },
                new RecentJournalNote
                {
                    Domain = "health",
                    Subtype = "symptom",
                    Note = "Still tired yesterday",
                    EntryDate = "2026-06-12",
                    CreatedAt = "2026-06-12T18:00:00Z",
                },
            ],
        };

        var response = JournalWellnessCheckInHelper.TryBuildAllGoodTodayResponse(
            "All good today",
            ctx,
            "Milo",
            UtcNow);

        response.Should().NotBeNull();
        response!.JournalSessionComplete.Should().BeTrue();
        response.JournalSummary.Should().Contain("back to normal");
        response.JournalSummary.Should().Contain("3 days");
        response.StructuredSummary!.Fields["STATUS"].Should().Be("Resolved");
        response.StructuredSummary.Fields["TRACKED_DAYS"].Should().Be("3");
    }

    [Fact]
    public void GetRecentIssueNotes_ignores_today_and_recovery_entries()
    {
        var ctx = new PetConversationalContextDto
        {
            RecentJournalNotes =
            [
                new RecentJournalNote
                {
                    Domain = "health",
                    Subtype = "mood",
                    Note = "All good today",
                    EntryDate = "2026-06-13",
                    CreatedAt = "2026-06-13T10:00:00Z",
                },
                new RecentJournalNote
                {
                    Domain = "health",
                    Subtype = "symptom",
                    Note = "Scratching a lot",
                    EntryDate = "2026-06-12",
                    CreatedAt = "2026-06-12T10:00:00Z",
                },
            ],
        };

        var issues = JournalWellnessCheckInHelper.GetRecentIssueNotes(ctx.RecentJournalNotes, UtcNow);
        issues.Should().HaveCount(1);
        issues[0].Note.Should().Contain("Scratching");
    }
}
