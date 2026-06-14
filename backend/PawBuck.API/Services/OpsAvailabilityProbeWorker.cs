using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;

namespace PawBuck.API.Services;

/// <summary>Periodic internal synthetics (Postgres, mail, journal) persisted for admin availability.</summary>
public sealed class OpsAvailabilityProbeWorker : BackgroundService
{
    private readonly IOpsProbeService _probes;
    private readonly IOptionsMonitor<OpsProbeOptions> _options;
    private readonly ILogger<OpsAvailabilityProbeWorker> _logger;

    public OpsAvailabilityProbeWorker(
        IOpsProbeService probes,
        IOptionsMonitor<OpsProbeOptions> options,
        ILogger<OpsAvailabilityProbeWorker> logger)
    {
        _probes = probes;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var opts = _options.CurrentValue;
            if (!opts.Enabled)
            {
                await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
                continue;
            }

            try
            {
                await _probes.RunAllProbesAsync("internal", stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OpsAvailabilityProbeWorker run failed");
            }

            var interval = Math.Clamp(opts.IntervalMinutes, 1, 60);
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(interval), stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }
}
