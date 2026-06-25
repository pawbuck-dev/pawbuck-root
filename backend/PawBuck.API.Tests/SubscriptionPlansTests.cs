using PawBuck.API;
using Xunit;

namespace PawBuck.API.Tests;

public class SubscriptionPlansTests
{
    [Theory]
    [InlineData("free", 0)]
    [InlineData("individual", 1)]
    [InlineData("premium", 1)]
    [InlineData("family", 2)]
    [InlineData(null, 0)]
    [InlineData("unknown", 0)]
    public void Rank_maps_canonical_plans(string? plan, int expectedRank)
    {
        Assert.Equal(expectedRank, SubscriptionPlans.Rank(plan));
    }

    [Theory]
    [InlineData("free", "free", true)]
    [InlineData("individual", "free", true)]
    [InlineData("family", "individual", true)]
    [InlineData("family", "family", true)]
    [InlineData("free", "individual", false)]
    [InlineData("individual", "family", false)]
    [InlineData("premium", "individual", true)]
    public void MeetsMinimum_respects_tier_rank(string activePlan, string minimumPlan, bool expected)
    {
        Assert.Equal(expected, SubscriptionPlans.MeetsMinimum(activePlan, minimumPlan));
    }
}
