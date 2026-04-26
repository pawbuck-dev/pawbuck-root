using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

/// <summary>End-user email / Review Inbox (not the Milo document vault — see <see cref="MiloDocumentsController"/>).</summary>
[ApiController]
[Route("api/mail")]
[Authorize]
public class MailController : ControllerBase
{
    private readonly IMailInboxResolveService _mailInbox;

    public MailController(IMailInboxResolveService mailInbox)
    {
        _mailInbox = mailInbox;
    }

    /// <summary>
    /// Re-run email attachment pipeline with user-chosen pet and document type (Review Inbox resolution).
    /// </summary>
    [HttpPost("resolve")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Resolve(
        [FromBody] MailResolveRequest? request,
        CancellationToken cancellationToken)
    {
        if (request == null || request.EmailId == Guid.Empty)
            return BadRequest(new { error = "email_id is required" });
        if (request.SelectedPetId == Guid.Empty)
            return BadRequest(new { error = "selected_pet_id is required" });

        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        var result = await _mailInbox.ResolveAsync(userId, request, cancellationToken);
        if (result.Ok)
            return Ok(new { ok = true, message = "Reprocessing started" });

        if (result.StatusCode == 502)
            return StatusCode(502, new { error = result.Error, detail = result.BodySnippet });
        if (result.StatusCode == 503)
            return StatusCode(503, new { error = result.Error });

        return StatusCode(
            result.StatusCode,
            new { error = result.Error ?? "Request failed" });
    }
}
