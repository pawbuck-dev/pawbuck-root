using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/care/nudges")]
[Authorize]
public sealed class CareNudgesController : ControllerBase
{
    private readonly ICareNudgeService _nudges;

    public CareNudgesController(ICareNudgeService nudges)
    {
        _nudges = nudges;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CareNudgeDto>>> List(
        [FromQuery] Guid? petId,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        if (petId.HasValue)
            return Ok(await _nudges.GetNudgesForPetAsync(userId.Value, petId.Value, cancellationToken));

        return Ok(await _nudges.GetNudgesForUserAsync(userId.Value, cancellationToken));
    }

    [HttpPost("dismiss")]
    public async Task<IActionResult> Dismiss(
        [FromBody] CareNudgeDismissRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        if (request.PetId == Guid.Empty || string.IsNullOrWhiteSpace(request.NudgeKind))
            return BadRequest(new { error = "petId and nudgeKind are required" });

        try
        {
            var snoozeDays = request.SnoozeDays ?? 7;
            await _nudges.DismissNudgeAsync(
                userId.Value,
                new CareNudgeDismissRequest
                {
                    PetId = request.PetId,
                    NudgeKind = request.NudgeKind.Trim(),
                    SnoozeDays = snoozeDays,
                },
                cancellationToken);
            return Ok(new { ok = true });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
