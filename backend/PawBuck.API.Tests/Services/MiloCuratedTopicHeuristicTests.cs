using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloCuratedTopicHeuristicTests
{
    [Theory]
    [InlineData("Is 40 pounds ok for my Golden?", "weight_range")]
    [InlineData("What is a healthy weight for a puppy?", "weight_range")]
    public void InferTopic_WeightQuestions_ReturnsWeightRange(string message, string expected)
    {
        MiloCuratedTopicHeuristic.InferTopic(message).Should().Be(expected);
    }

    [Theory]
    [InlineData("When does my dog need rabies booster?", "vaccine_guidance")]
    [InlineData("Which vaccines are core for cats?", "vaccine_guidance")]
    public void InferTopic_VaccineQuestions_ReturnsVaccineGuidance(string message, string expected)
    {
        MiloCuratedTopicHeuristic.InferTopic(message).Should().Be(expected);
    }

    [Theory]
    [InlineData("Do I need heartworm prevention?", "parasite_prevention")]
    [InlineData("Flea and tick season tips", "parasite_prevention")]
    public void InferTopic_ParasiteQuestions_ReturnsParasitePrevention(string message, string expected)
    {
        MiloCuratedTopicHeuristic.InferTopic(message).Should().Be(expected);
    }

    [Theory]
    [InlineData("How much should I feed my dog?", "nutrition_basics")]
    [InlineData("What does AAFCO mean on pet food?", "nutrition_basics")]
    public void InferTopic_NutritionQuestions_ReturnsNutritionBasics(string message, string expected)
    {
        MiloCuratedTopicHeuristic.InferTopic(message).Should().Be(expected);
    }

    [Fact]
    public void InferTopic_ProductHowTo_ReturnsNull()
    {
        MiloCuratedTopicHeuristic.InferTopic("How do I upload a vaccine record in PawBuck?").Should().BeNull();
    }
}
