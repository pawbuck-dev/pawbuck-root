using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/document-processing")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportDocumentProcessingController : ControllerBase
{
    private readonly ISupportDocumentProcessingService _documentProcessing;

    public SupportDocumentProcessingController(ISupportDocumentProcessingService documentProcessing)
    {
        _documentProcessing = documentProcessing;
    }

    /// <summary>
    /// Email OCR/Milo pipeline success rates, failure categories, and vault filing metrics (defaults to last 30 days).
    /// </summary>
    [HttpGet("metrics")]
    [ProducesResponseType(typeof(SupportDocumentProcessingMetricsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Metrics(
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _documentProcessing.GetMetricsAsync(from, to, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }
}
