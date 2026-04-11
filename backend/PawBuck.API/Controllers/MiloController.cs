using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

/// <summary>
/// RAG-based FAQ API for the Paw Buck ecosystem (Milo).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class MiloController : ControllerBase
{
    private readonly MiloRagService _ragService;
    private readonly IMiloCuratedSnippetsService _curatedSnippets;
    private readonly IOptions<MiloOptions> _miloOptions;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<MiloController> _logger;

    public MiloController(
        MiloRagService ragService,
        IMiloCuratedSnippetsService curatedSnippets,
        IOptions<MiloOptions> miloOptions,
        IWebHostEnvironment environment,
        ILogger<MiloController> logger)
    {
        _ragService = ragService;
        _curatedSnippets = curatedSnippets;
        _miloOptions = miloOptions;
        _environment = environment;
        _logger = logger;
    }

    /// <summary>
    /// Ask Milo a question. Uses RAG context from the documentation table; falls back to General Help when no context is found.
    /// </summary>
    [HttpPost("ask")]
    [ProducesResponseType(typeof(MiloQueryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Ask([FromBody] MiloAskRequest request, CancellationToken cancellationToken)
    {
        if (request?.Question == null)
        {
            return BadRequest(new { error = "question is required" });
        }

        var question = request.Question.Trim();
        if (string.IsNullOrEmpty(question))
        {
            return BadRequest(new { error = "question cannot be empty" });
        }

        try
        {
            var response = await _ragService.AskAsync(question, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Milo Ask failed");
            return StatusCode(500, new MiloQueryResponse
            {
                Answer = MiloRagService.GENERAL_HELP_RESPONSE,
                UsedContext = false,
                IsGeneralHelp = true
            });
        }
    }

    /// <summary>
    /// Curated breed/species snippets for Milo chat grounding. Prefer Edge calling this when
    /// <c>MILO_INTERNAL_SERVICE_KEY</c> is configured; otherwise Edge reads Postgres directly.
    /// </summary>
    [HttpGet("curated-guidance")]
    [ProducesResponseType(typeof(IReadOnlyList<MiloCuratedSnippetDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> CuratedGuidance(
        [FromHeader(Name = "X-Pawbuck-Milo-Internal-Key")] string? internalKey,
        [FromQuery] string? breed,
        [FromQuery] string? animalType,
        [FromQuery] string? topic,
        CancellationToken cancellationToken)
    {
        var expected = _miloOptions.Value.InternalServiceKey?.Trim();
        if (string.IsNullOrEmpty(expected))
        {
            if (!_environment.IsDevelopment())
            {
                _logger.LogWarning("Milo InternalServiceKey not configured; curated-guidance disabled outside Development");
                return StatusCode(503, new { error = "curated-guidance not configured" });
            }
        }
        else if (!string.Equals(internalKey, expected, StringComparison.Ordinal))
        {
            return Unauthorized();
        }

        try
        {
            var rows = await _curatedSnippets.GetGuidanceAsync(breed, animalType, topic, cancellationToken);
            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Curated guidance query failed");
            return StatusCode(500, new { error = "curated-guidance failed" });
        }
    }
}
