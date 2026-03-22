using Microsoft.AspNetCore.Mvc;
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
    private readonly ILogger<MiloController> _logger;

    public MiloController(MiloRagService ragService, ILogger<MiloController> logger)
    {
        _ragService = ragService;
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
}
