using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/milo/journal")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportMiloJournalController : ControllerBase
{
    private readonly IMiloJournalConfigAdminService _configAdmin;
    private readonly IMiloJournalFeedbackAggregateService _aggregates;
    private readonly ILogger<SupportMiloJournalController> _logger;

    public SupportMiloJournalController(
        IMiloJournalConfigAdminService configAdmin,
        IMiloJournalFeedbackAggregateService aggregates,
        ILogger<SupportMiloJournalController> logger)
    {
        _configAdmin = configAdmin;
        _aggregates = aggregates;
        _logger = logger;
    }

    [HttpGet("config")]
    [ProducesResponseType(typeof(MiloJournalConfigSnapshot), StatusCodes.Status200OK)]
    public async Task<ActionResult<MiloJournalConfigSnapshot>> GetConfig(CancellationToken cancellationToken)
    {
        var c = await _configAdmin.GetAsync(cancellationToken);
        return Ok(c);
    }

    [HttpPatch("config")]
    [ProducesResponseType(typeof(MiloJournalConfigSnapshot), StatusCodes.Status200OK)]
    public async Task<ActionResult<MiloJournalConfigSnapshot>> PatchConfig(
        [FromBody] MiloJournalConfigPatchRequest? body,
        CancellationToken cancellationToken)
    {
        if (body?.Config == null)
            return BadRequest(new { error = "config is required" });

        await _configAdmin.SaveAsync(body.Config, cancellationToken);
        var c = await _configAdmin.GetAsync(cancellationToken);
        _logger.LogInformation("Milo journal config updated via admin");
        return Ok(c);
    }

    [HttpGet("feedback-aggregates")]
    [ProducesResponseType(typeof(MiloJournalFeedbackAggregatesDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<MiloJournalFeedbackAggregatesDto>> GetFeedbackAggregates(
        CancellationToken cancellationToken)
    {
        var dto = await _aggregates.GetAggregatesAsync(cancellationToken);
        return Ok(dto);
    }
}
