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
}
