using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/ops-health")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportOpsController : ControllerBase
{
    private readonly IOpsProbeService _probes;
    private readonly IGeminiTelemetryRecorder _geminiTelemetry;

    public SupportOpsController(IOpsProbeService probes, IGeminiTelemetryRecorder geminiTelemetry)
    {
        _probes = probes;
        _geminiTelemetry = geminiTelemetry;
    }

    /// <summary>Live config checklist + Postgres ping + latest probe snapshots.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(SupportOpsHealthResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOpsHealth(CancellationToken cancellationToken)
    {
        var result = await _probes.GetLiveHealthAsync(cancellationToken);
        return Ok(result);
    }

    /// <summary>Availability percentages and daily overall trend (default 7 days).</summary>
    [HttpGet("availability")]
    [ProducesResponseType(typeof(SupportOpsAvailabilityResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAvailability(
        [FromQuery] int days = 7,
        CancellationToken cancellationToken = default)
    {
        var result = await _probes.GetAvailabilityAsync(days, cancellationToken);
        return Ok(result);
    }

    /// <summary>In-process Gemini call counters since this API task started (Phase 0 Milo telemetry).</summary>
    [HttpGet("gemini-telemetry")]
    [ProducesResponseType(typeof(GeminiTelemetrySnapshot), StatusCodes.Status200OK)]
    public IActionResult GetGeminiTelemetry() => Ok(_geminiTelemetry.GetSnapshot());
}
