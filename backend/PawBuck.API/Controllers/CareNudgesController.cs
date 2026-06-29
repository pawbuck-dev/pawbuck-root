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

    private Guid? GetUserId()
    {
        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
