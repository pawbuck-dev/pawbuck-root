using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

/// <summary>
/// Milo vision pipeline for the pet document vault (<c>pet_documents</c>).
/// </summary>
[ApiController]
[Route("api/milo/documents")]
public class MiloDocumentsController : ControllerBase
{
    private readonly IMiloVisionService _miloVision;
    private readonly IOptions<MiloOptions> _miloOptions;
    private readonly ILogger<MiloDocumentsController> _logger;

    public MiloDocumentsController(
        IMiloVisionService miloVision,
        IOptions<MiloOptions> miloOptions,
        ILogger<MiloDocumentsController> logger)
    {
        _miloVision = miloVision;
        _miloOptions = miloOptions;
        _logger = logger;
    }

    /// <summary>
    /// Download file from Supabase Storage (caller JWT), run Gemini classify + extract, insert <c>pet_documents</c>.
    /// </summary>
    [Authorize]
    [HttpPost("analyze")]
    [ProducesResponseType(typeof(PetDocumentVaultRowDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Analyze(
        [FromBody] AnalyzePetDocumentRequest? request,
        CancellationToken cancellationToken)
    {
        if (request == null || request.PetId == Guid.Empty)
            return BadRequest(new { error = "petId is required" });

        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        var auth = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(auth) || !auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return Unauthorized(new { error = "Bearer token required for storage download" });

        var bearerToken = auth["Bearer ".Length..].Trim();

        try
        {
            var row = await _miloVision.AnalyzeAndPersistAsync(userId, bearerToken, request, cancellationToken);
            return Ok(row);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Storage download failed for pet document analyze");
            return StatusCode(502, new { error = "storage_download_failed", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Milo vision analyze failed");
            return StatusCode(500, new { error = "analyze_failed", message = ex.Message });
        }
    }

    /// <summary>
    /// Same as <see cref="Analyze"/> but uses Storage service role on the API and <c>X-Pawbuck-Milo-Internal-Key</c> (Edge / email pipeline).
    /// </summary>
    [HttpPost("analyze-internal")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PetDocumentVaultRowDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> AnalyzeInternal(
        [FromHeader(Name = "X-Pawbuck-Milo-Internal-Key")] string? internalKey,
        [FromBody] AnalyzePetDocumentInternalRequest? request,
        CancellationToken cancellationToken)
    {
        var expected = _miloOptions.Value.InternalServiceKey?.Trim();
        if (string.IsNullOrEmpty(expected))
        {
            _logger.LogWarning("Milo InternalServiceKey not configured; analyze-internal disabled");
            return StatusCode(503, new { error = "analyze-internal not configured" });
        }

        if (!string.Equals(internalKey, expected, StringComparison.Ordinal))
            return Unauthorized();

        if (request == null || request.PetId == Guid.Empty || request.UserId == Guid.Empty)
            return BadRequest(new { error = "petId and userId are required" });

        try
        {
            var row = await _miloVision.AnalyzeAndPersistInternalAsync(request, cancellationToken);
            return Ok(row);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Internal analyze storage download failed");
            return StatusCode(502, new { error = "storage_download_failed", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Milo vision analyze-internal failed");
            return StatusCode(500, new { error = "analyze_failed", message = ex.Message });
        }
    }
}
