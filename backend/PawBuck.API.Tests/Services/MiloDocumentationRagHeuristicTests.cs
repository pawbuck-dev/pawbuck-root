using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloDocumentationRagHeuristicTests
{
    [Theory]
    [InlineData("What is PawBuck?")]
    [InlineData("what is pawbuck")]
    [InlineData("How to receive a pet transfer?")]
    [InlineData("How do I accept a pet transfer?")]
    [InlineData("How do I set up family sharing?")]
    [InlineData("How much does PawBuck cost?")]
    [InlineData("Where do I add vaccination records?")]
    public void ShouldForceDocumentationRag_true_for_product_faq_phrases(string message) =>
        MiloDocumentationRagHeuristic.ShouldForceDocumentationRag(message).Should().BeTrue();

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("Benji is limping after our walk")]
    [InlineData("Is rabies vaccine current?")]
    public void ShouldForceDocumentationRag_false_when_not_product_help(string message) =>
        MiloDocumentationRagHeuristic.ShouldForceDocumentationRag(message).Should().BeFalse();
}
