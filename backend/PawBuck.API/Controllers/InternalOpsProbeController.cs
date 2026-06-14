using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

/// <summary>External synthetic ingest (GitHub Actions) — shared secret, no user JWT.</summary>
[ApiController]
[Route("api/internal/ops-probes")]
public class InternalOpsProbeController : ControllerBase
{
    private readonly IOpsProbeService _probes;
    private readonly IOptions<OpsProbeOptions> _probeOptions;
    private readonly IOptions<MiloOptions> _miloOptions;
    private readonly ILogger<InternalOpsProbeController> _logger;

    public InternalOpsProbeController(
        IOpsProbeService probes,
        IOptions<OpsProbeOptions> probeOptions,
        IOptions<MiloOptions> miloOptions,
        ILogger<InternalOpsProbeController> logger)
    {
        _probes = probes;
        _probeOptions = probeOptions;
        _miloOptions = miloOptions;
        _logger = logger;
    }

    [HttpPost("ingest")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Ingest(
        [FromHeader(Name = "X-Ops-Probe-Key")] string? probeKey,
        [FromBody] OpsProbeIngestRequest? body,
        CancellationToken cancellationToken)
    {
        if (!IsAuthorized(probeKey))
            return Unauthorized(new { error = "invalid probe key" });

        if (body == null || string.IsNullOrWhiteSpace(body.ProbeName))
            return BadRequest(new { error = "probeName is required" });

        var source = string.IsNullOrWhiteSpace(body.Source) ? "external_github" : body.Source.Trim();
        await _probes.RecordProbeAsync(
            body.ProbeName.Trim(),
            source,
            body.Ok,
            body.LatencyMs,
            body.ErrorSummary,
            cancellationToken);

        _logger.LogDebug(
            "External ops probe ingested: {ProbeName} ok={Ok} latency={LatencyMs}",
            body.ProbeName,
            body.Ok,
            body.LatencyMs);

        return NoContent();
    }

    private bool IsAuthorized(string? probeKey)
    {
        var expected = _probeOptions.Value.ExternalIngestKey?.Trim();
        if (string.IsNullOrEmpty(expected))
            expected = _miloOptions.Value.InternalServiceKey?.Trim();
        if (string.IsNullOrEmpty(expected))
            return false;
        return string.Equals(probeKey?.Trim(), expected, StringComparison.Ordinal);
    }
}
