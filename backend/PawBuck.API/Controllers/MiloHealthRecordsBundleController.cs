using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

/// <summary>
/// Milo “single event bundle” for Health Records: optional file (vision vault) + optional journal text in one call.
/// </summary>
[ApiController]
[Route("api/milo/health-records")]
public class MiloHealthRecordsBundleController : ControllerBase
{
    private readonly IMiloHealthBundleService _bundle;
    private readonly ILogger<MiloHealthRecordsBundleController> _logger;

    public MiloHealthRecordsBundleController(
        IMiloHealthBundleService bundle,
        ILogger<MiloHealthRecordsBundleController> logger)
    {
        _bundle = bundle;
        _logger = logger;
    }

    /// <summary>Process file and/or text; persists <c>pet_documents</c> (when file) and <c>pet_journal_entries</c> (when text).</summary>
    [Authorize]
    [HttpPost("bundle")]
    [ProducesResponseType(typeof(MiloHealthBundleResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> PostBundle(
        [FromBody] MiloHealthBundleRequest? body,
        CancellationToken cancellationToken)
    {
        if (body == null || body.PetId == Guid.Empty)
            return BadRequest(new { error = "petId is required" });

        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        var auth = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return Unauthorized(new { error = "Bearer token required for storage-backed document analyze" });

        var bearerToken = auth["Bearer ".Length..].Trim();

        try
        {
            var result = await _bundle.ProcessBundleAsync(userId, bearerToken, body, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Health records bundle failed for pet {PetId}", body.PetId);
            return StatusCode(500, new { error = "bundle_failed", message = ex.Message });
        }
    }
}
