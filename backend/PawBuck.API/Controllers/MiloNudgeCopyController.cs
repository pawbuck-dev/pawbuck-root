using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/milo")]
public sealed class MiloNudgeCopyController : ControllerBase
{
    private readonly IMiloNudgeCopyService _copy;
    private readonly IOptions<MiloOptions> _miloOptions;
    private readonly ILogger<MiloNudgeCopyController> _logger;

    public MiloNudgeCopyController(
        IMiloNudgeCopyService copy,
        IOptions<MiloOptions> miloOptions,
        ILogger<MiloNudgeCopyController> logger)
    {
        _copy = copy;
        _miloOptions = miloOptions;
        _logger = logger;
    }

    /// <summary>Generate optional Milo copy for proactive nudges (template fallback when disabled or unsafe).</summary>
    [HttpPost("nudge-copy")]
    [Authorize]
    public async Task<ActionResult<MiloNudgeCopyResponse>> NudgeCopyForUser(
        [FromBody] MiloNudgeCopyRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Kind) || string.IsNullOrWhiteSpace(request.PetName))
            return BadRequest(new { error = "kind and petName are required" });

        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        var response = await _copy.GenerateCopyAsync(request, userId, null, cancellationToken);
        return Ok(response);
    }

    [HttpPost("nudge-copy-internal")]
    public async Task<ActionResult<MiloNudgeCopyResponse>> NudgeCopyInternal(
        [FromHeader(Name = "X-Pawbuck-Milo-Internal-Key")] string? internalKey,
        [FromBody] MiloNudgeCopyRequest request,
        CancellationToken cancellationToken)
    {
        var expected = _miloOptions.Value.InternalServiceKey?.Trim();
        if (string.IsNullOrEmpty(expected))
        {
            _logger.LogWarning("Milo nudge-copy-internal: InternalServiceKey not configured");
            return StatusCode(503, new { error = "nudge-copy-internal not configured" });
        }

        if (!string.Equals(internalKey, expected, StringComparison.Ordinal))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Kind) || string.IsNullOrWhiteSpace(request.PetName))
            return BadRequest(new { error = "kind and petName are required" });

        var response = await _copy.GenerateCopyAsync(request, null, null, cancellationToken);
        return Ok(response);
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
