using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloReasoningServiceGuardTests
{
    [Fact]
    public void ApplyNoPetGuard_WhenNotOwned_ForcesNone()
    {
        var plan = new MiloChatPlanDto
        {
            DataNeeded = new List<string> { MiloPetFactsKinds.Vaccinations },
            NeedsDocumentationRag = true,
            ReasoningBrief = "test",
        };

        MiloReasoningService.ApplyNoPetGuard(plan, petHasVerifiedAccess: false);

        plan.DataNeeded.Should().BeEquivalentTo(new[] { MiloPetFactsKinds.None });
    }

    [Fact]
    public void ApplyNoPetGuard_WhenOwned_DoesNotChange()
    {
        var plan = new MiloChatPlanDto
        {
            DataNeeded = new List<string> { MiloPetFactsKinds.Vaccinations },
            NeedsDocumentationRag = false,
            ReasoningBrief = "test",
        };

        MiloReasoningService.ApplyNoPetGuard(plan, petHasVerifiedAccess: true);

        plan.DataNeeded.Should().BeEquivalentTo(new[] { MiloPetFactsKinds.Vaccinations });
    }
}
