using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloDocumentationRagHeuristicTests
{
    [Theory]
    [InlineData("How does family sharing work", "06-family-sharing.md")]
    [InlineData("family access for my dog", "06-family-sharing.md")]
    [InlineData("How do I manage access?", "06-family-sharing.md")]
    public void GetBoostSourceFiles_FamilyTopics_ReturnsFamilyDoc(string message, string expectedFile)
    {
        var files = MiloDocumentationRagHeuristic.GetBoostSourceFiles(message);
        files.Should().Contain(expectedFile);
    }

    [Theory]
    [InlineData("How do i receive a pet transfer")]
    [InlineData("How to accept a pet transfer")]
    [InlineData("claim a pet with transfer code")]
    public void GetBoostSourceFiles_TransferTopics_ReturnsTransferDoc(string message)
    {
        var files = MiloDocumentationRagHeuristic.GetBoostSourceFiles(message);
        files.Should().Contain("07-pet-transfer.md");
    }

    [Fact]
    public void GetBoostSourceFiles_CombinedFamilyAndTransfer_ReturnsBoth()
    {
        var files = MiloDocumentationRagHeuristic.GetBoostSourceFiles(
            "After a pet transfer, how do I fix family sharing?");
        files.Should().BeEquivalentTo("06-family-sharing.md", "07-pet-transfer.md");
    }

    [Fact]
    public void GetBoostSourceFiles_Unrelated_ReturnsEmpty()
    {
        MiloDocumentationRagHeuristic.GetBoostSourceFiles("What is 2+2?").Should().BeEmpty();
    }

    [Theory]
    [InlineData("How do I log symptoms in the journal?")]
    [InlineData("Should I write down my pet's behavior changes?")]
    [InlineData("I want to track symptoms for my dog")]
    public void GetBoostSourceFiles_JournalTopics_ReturnsJournalDoc(string message)
    {
        var files = MiloDocumentationRagHeuristic.GetBoostSourceFiles(message);
        files.Should().Contain("11-pet-journal.md");
    }

    [Theory]
    [InlineData("What can Milo help me with?")]
    [InlineData("What does Milo do in the app?")]
    public void GetBoostSourceFiles_MiloTopics_ReturnsMiloDoc(string message)
    {
        var files = MiloDocumentationRagHeuristic.GetBoostSourceFiles(message);
        files.Should().Contain("08-milo.md");
    }

    [Theory]
    [InlineData("Should I keep notes when my cat vomits?")]
    [InlineData("How do I track behavior changes?")]
    [InlineData("Is note taking useful for vet visits?")]
    public void ShouldForceDocumentationRag_ObservationTopics_ReturnsTrue(string message)
    {
        MiloDocumentationRagHeuristic.ShouldForceDocumentationRag(message).Should().BeTrue();
    }
}
