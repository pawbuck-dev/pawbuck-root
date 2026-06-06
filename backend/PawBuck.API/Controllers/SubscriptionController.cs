using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using PawBuck.API;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

/// <summary>
/// Authenticated subscription / paywall configuration for the mobile app.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubscriptionController : ControllerBase
{
    private readonly ISubscriptionFeatureGateService _featureGates;
    private readonly IUserEntitlementService _entitlements;

    public SubscriptionController(
        ISubscriptionFeatureGateService featureGates,
        IUserEntitlementService entitlements)
    {
        _featureGates = featureGates;
        _entitlements = entitlements;
    }

    /// <summary>
    /// Feature gates with minimum plan per product area.
    /// </summary>
    [HttpGet("feature-gates")]
    [ProducesResponseType(typeof(SubscriptionFeatureGatesResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SubscriptionFeatureGatesResponse>> GetFeatureGates(CancellationToken cancellationToken)
    {
        var items = await _featureGates.GetAllAsync(cancellationToken);
        return Ok(new SubscriptionFeatureGatesResponse { Items = items });
    }

    /// <summary>
    /// Current plan, usage counters, limits, and founding spots remaining.
    /// </summary>
    [HttpGet("status")]
    [ProducesResponseType(typeof(SubscriptionStatusResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SubscriptionStatusResponse>> GetStatus(CancellationToken cancellationToken)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        var status = await _entitlements.GetStatusAsync(userId, cancellationToken);
        if (status is null)
        {
            return Ok(new SubscriptionStatusResponse
            {
                Plan = SubscriptionPlans.Free,
                Usage = new SubscriptionUsageDto(),
                Limits = new SubscriptionLimitsDto { MaxFamilyMembers = 0 },
            });
        }

        return Ok(status);
    }
}
