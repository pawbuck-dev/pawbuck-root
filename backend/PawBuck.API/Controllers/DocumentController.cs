using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

/// <summary>
/// Document classification endpoint. Accepts same payload format (image_url) as Supabase Edge function.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class DocumentController : ControllerBase
{
    private readonly ClassificationService _classificationService;
    private readonly ILogger<DocumentController> _logger;

    public DocumentController(ClassificationService classificationService, ILogger<DocumentController> logger)
    {
        _classificationService = classificationService;
        _logger = logger;
    }

    /// <summary>
    /// Classify a pet document from its image URL. Returns document type and the Milo extraction prompt for that type.
    /// Payload format: { "image_url": "https://..." } for parity with Supabase Edge function.
    /// </summary>
    [HttpPost("classify")]
    [ProducesResponseType(typeof(ClassifyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Classify([FromBody] ClassifyRequest request, CancellationToken cancellationToken)
    {
        if (request?.ImageUrl == null || string.IsNullOrWhiteSpace(request.ImageUrl))
        {
            return BadRequest(new { error = "image_url is required" });
        }

        try
        {
            var response = await _classificationService.ClassifyAsync(request.ImageUrl, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Classification failed for image_url");
            return StatusCode(500, new { error = "Classification failed" });
        }
    }
}
