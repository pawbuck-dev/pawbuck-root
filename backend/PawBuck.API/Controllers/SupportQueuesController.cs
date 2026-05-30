using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/queues")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportQueuesController : ControllerBase
{
    private readonly ISupportQueuesService _queues;

    public SupportQueuesController(ISupportQueuesService queues)
    {
        _queues = queues;
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(SupportQueuesSummaryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        try
        {
            var summary = await _queues.GetSummaryAsync(cancellationToken);
            return Ok(summary);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }
}
