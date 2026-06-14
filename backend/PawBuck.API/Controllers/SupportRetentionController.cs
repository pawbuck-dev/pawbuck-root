using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/retention")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportRetentionController : ControllerBase
{
    private readonly IRetentionService _retention;

    public SupportRetentionController(IRetentionService retention)
    {
        _retention = retention;
    }

    [HttpGet("runs")]
    public async Task<IActionResult> GetRuns([FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var rows = await _retention.GetRecentRunsAsync(limit, cancellationToken);
        return Ok(new
        {
            runs = rows.Select(r => new
            {
                id = r.Id,
                jobName = r.JobName,
                ranAt = r.RanAt,
                rowsAffected = r.RowsAffected,
                details = r.DetailsJson,
            }),
        });
    }
}
