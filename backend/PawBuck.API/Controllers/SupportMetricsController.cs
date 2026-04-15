using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/metrics")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportMetricsController : ControllerBase
{
    private readonly ISupportMetricsService _metrics;

    public SupportMetricsController(ISupportMetricsService metrics)
    {
        _metrics = metrics;
    }

    [HttpGet]
    [ProducesResponseType(typeof(SupportMetricsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        try
        {
            var m = await _metrics.GetMetricsAsync(cancellationToken);
            return Ok(m);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }
}
