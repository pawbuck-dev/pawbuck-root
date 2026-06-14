using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using PawBuck.API;
using PawBuck.API.Controllers;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Controllers;

public class SupportSubscriptionControllerTests
{
    private static readonly Guid UserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    [Fact]
    public async Task GetPlanBreakdown_Returns503_WhenDatabaseNotConfigured()
    {
        var entitlements = new Mock<IUserEntitlementService>();
        entitlements
            .Setup(e => e.GetPlanBreakdownAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((SubscriptionPlanBreakdownResponse?)null);

        var controller = new SupportSubscriptionController(entitlements.Object);
        var result = await controller.GetPlanBreakdown(CancellationToken.None);

        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status503ServiceUnavailable);
    }

    [Fact]
    public async Task GetPlanBreakdown_ReturnsOk_WithTiers()
    {
        var breakdown = new SubscriptionPlanBreakdownResponse
        {
            TotalUsers = 100,
            UsersWithoutEntitlementRow = 80,
            ExpiredPaidSubscriptions = 2,
            FoundingMembers = 5,
            AsOf = DateTimeOffset.UtcNow,
            Tiers =
            [
                new SubscriptionPlanTierCountDto { Plan = "free", UserCount = 90, FoundingMembers = 0 },
                new SubscriptionPlanTierCountDto { Plan = "individual", UserCount = 8, FoundingMembers = 3 },
                new SubscriptionPlanTierCountDto { Plan = "family", UserCount = 2, FoundingMembers = 2 },
            ],
        };

        var entitlements = new Mock<IUserEntitlementService>();
        entitlements
            .Setup(e => e.GetPlanBreakdownAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(breakdown);

        var controller = new SupportSubscriptionController(entitlements.Object);
        var result = await controller.GetPlanBreakdown(CancellationToken.None);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var body = ok.Value.Should().BeOfType<SubscriptionPlanBreakdownResponse>().Subject;
        body.TotalUsers.Should().Be(100);
        body.Tiers.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetUserStatus_ReturnsOk_WithStatus()
    {
        var status = new SubscriptionStatusResponse
        {
            Plan = "individual",
            ActivePlan = "individual",
            IsFoundingMember = false,
            Usage = new SubscriptionUsageDto { MiloConversationsUsed = 1, AiJournalEntriesUsed = 0 },
            Limits = new SubscriptionLimitsDto { MaxFamilyMembers = 0 },
            DocumentCount = 4,
        };

        var entitlements = new Mock<IUserEntitlementService>();
        entitlements
            .Setup(e => e.GetStatusAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(status);

        var controller = new SupportSubscriptionController(entitlements.Object);
        var result = await controller.GetUserStatus(UserId, CancellationToken.None);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<SubscriptionStatusResponse>().Which.Plan.Should().Be("individual");
    }

    [Fact]
    public async Task PutUserEntitlement_ReturnsOk_WhenGranted()
    {
        var status = new SubscriptionStatusResponse
        {
            Plan = "family",
            ActivePlan = "family",
            IsAdminGrant = true,
            ProductId = AdminEntitlementGrant.ProductId,
            SubscriptionStatus = AdminEntitlementGrant.SubscriptionStatus,
            Usage = new SubscriptionUsageDto(),
            Limits = new SubscriptionLimitsDto { MaxFamilyMembers = 5 },
            DocumentCount = 0,
        };

        var entitlements = new Mock<IUserEntitlementService>();
        entitlements
            .Setup(e => e.SetAdminEntitlementAsync(
                UserId,
                "family",
                null,
                "beta tester",
                It.IsAny<Guid?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminEntitlementMutationResult { Status = status });

        var controller = new SupportSubscriptionController(entitlements.Object);
        var result = await controller.PutUserEntitlement(
            UserId,
            new SetAdminEntitlementRequest { Plan = "family", Note = "beta tester" },
            CancellationToken.None);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<SubscriptionStatusResponse>().Which.IsAdminGrant.Should().BeTrue();
    }

    [Fact]
    public async Task PutUserEntitlement_Returns404_WhenUserMissing()
    {
        var entitlements = new Mock<IUserEntitlementService>();
        entitlements
            .Setup(e => e.SetAdminEntitlementAsync(
                UserId,
                "individual",
                null,
                null,
                It.IsAny<Guid?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminEntitlementMutationResult { Error = "user_not_found" });

        var controller = new SupportSubscriptionController(entitlements.Object);
        var result = await controller.PutUserEntitlement(
            UserId,
            new SetAdminEntitlementRequest { Plan = "individual" },
            CancellationToken.None);

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }
}
