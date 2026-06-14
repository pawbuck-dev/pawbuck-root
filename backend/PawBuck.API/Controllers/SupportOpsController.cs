using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/ops-health")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportOpsController : ControllerBase
{
    private readonly IOpsProbeService _probes;

    public SupportOpsController(IOpsProbeService probes)
    {
        _probes = probes;
    }

    /// <summary>Live config checklist + Postgres ping + latest probe snapshots.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(SupportOpsHealthResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOpsHealth(CancellationToken cancellationToken)
    {
        var result = await _probes.GetLiveHealthAsync(cancellationToken);
        return Ok(result);
    }

    /// <summary>Availability percentages and daily overall trend (default 7 days).</summary>
    [HttpGet("availability")]
    [ProducesResponseType(typeof(SupportOpsAvailabilityResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAvailability(
        [FromQuery] int days = 7,
        CancellationToken cancellationToken = default)
    {
        var result = await _probes.GetAvailabilityAsync(days, cancellationToken);
        return Ok(result);
    }
}
