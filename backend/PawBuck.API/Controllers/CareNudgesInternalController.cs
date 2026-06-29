using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/care/nudges")]
public sealed class CareNudgesInternalController : ControllerBase
{
    private readonly ICareNudgePushService _push;
    private readonly IOptions<MiloOptions> _miloOptions;
    private readonly ILogger<CareNudgesInternalController> _logger;

    public CareNudgesInternalController(
        ICareNudgePushService push,
        IOptions<MiloOptions> miloOptions,
        ILogger<CareNudgesInternalController> logger)
    {
        _push = push;
        _miloOptions = miloOptions;
        _logger = logger;
    }

    [HttpPost("run-internal")]
    public async Task<ActionResult<CareNudgeRunResultDto>> RunInternal(
        [FromHeader(Name = "X-Pawbuck-Milo-Internal-Key")] string? internalKey,
        CancellationToken cancellationToken)
    {
        var expected = _miloOptions.Value.InternalServiceKey?.Trim();
        if (string.IsNullOrEmpty(expected))
        {
            _logger.LogWarning("Care nudge run-internal: InternalServiceKey not configured");
            return StatusCode(503, new { error = "run-internal not configured" });
        }

        if (!string.Equals(internalKey, expected, StringComparison.Ordinal))
            return Unauthorized();

        var result = await _push.RunPushCycleAsync(cancellationToken);
        return Ok(result);
    }
}
