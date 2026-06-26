using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/milo/quality")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportMiloQualityController : ControllerBase
{
    private readonly ISupportMiloQualityService _quality;

    public SupportMiloQualityController(ISupportMiloQualityService quality) => _quality = quality;

    /// <summary>Milo AI quality overview: success rate, surfaces, top failure codes (default last 30 days).</summary>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(SupportMiloQualityOverviewResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Overview(
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _quality.GetOverviewAsync(from, to, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    /// <summary>Paginated Milo outcome rows for drill-down (no message text stored).</summary>
    [HttpGet("outcomes")]
    [ProducesResponseType(typeof(SupportMiloQualityOutcomesResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Outcomes(
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        [FromQuery] Guid? petId = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? surface = null,
        [FromQuery] string? outcome = null,
        [FromQuery] string? failureCode = null,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(await _quality.ListOutcomesAsync(
                from, to, petId, userId, surface, outcome, failureCode, limit, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }
}
