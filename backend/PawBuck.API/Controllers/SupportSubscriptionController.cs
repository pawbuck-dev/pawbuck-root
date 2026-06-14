using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/subscription")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportSubscriptionController : ControllerBase
{
    private readonly IUserEntitlementService _entitlements;

    public SupportSubscriptionController(IUserEntitlementService entitlements)
    {
        _entitlements = entitlements;
    }

    [HttpGet("founding-stats")]
    [ProducesResponseType(typeof(FoundingMemberStatsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<FoundingMemberStatsResponse>> GetFoundingStats(CancellationToken cancellationToken)
    {
        var stats = await _entitlements.GetFoundingMemberStatsAsync(cancellationToken);
        if (stats is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Database not configured" });

        return Ok(stats);
    }

    [HttpGet("plan-breakdown")]
    [ProducesResponseType(typeof(SubscriptionPlanBreakdownResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<SubscriptionPlanBreakdownResponse>> GetPlanBreakdown(CancellationToken cancellationToken)
    {
        var breakdown = await _entitlements.GetPlanBreakdownAsync(cancellationToken);
        if (breakdown is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Database not configured" });

        return Ok(breakdown);
    }

    [HttpGet("users/{userId:guid}/status")]
    [ProducesResponseType(typeof(SubscriptionStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<SubscriptionStatusResponse>> GetUserStatus(Guid userId, CancellationToken cancellationToken)
    {
        var status = await _entitlements.GetStatusAsync(userId, cancellationToken);
        if (status is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Database not configured" });

        return Ok(status);
    }

    /// <summary>
    /// Grant complimentary Individual/Family access or revoke to Free (admin support only).
    /// Writes <c>product_id = admin_grant</c>; not billed through App Store / RevenueCat.
    /// </summary>
    [HttpPut("users/{userId:guid}/entitlement")]
    [ProducesResponseType(typeof(SubscriptionStatusResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<SubscriptionStatusResponse>> PutUserEntitlement(
        Guid userId,
        [FromBody] SetAdminEntitlementRequest body,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(body.Plan))
            return BadRequest(new { error = "plan is required (free, individual, or family)" });

        Guid? adminUserId = null;
        var sub = User?.FindFirstValue("sub") ?? User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(sub, out var parsedAdmin))
            adminUserId = parsedAdmin;

        var result = await _entitlements.SetAdminEntitlementAsync(
            userId,
            body.Plan,
            body.ExpiresAt,
            body.Note,
            adminUserId,
            cancellationToken);

        if (result is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Database not configured" });

        return result.Error switch
        {
            "user_not_found" => NotFound(new { error = "User not found" }),
            "invalid_plan" => BadRequest(new { error = "plan must be free, individual, or family" }),
            "invalid_expiry" => BadRequest(new { error = "expiresAt must be in the future when set" }),
            _ when result.Status is null => StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "Could not load status" }),
            _ => Ok(result.Status),
        };
    }
}
