using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;

namespace PawBuck.API.Services;

/// <summary>Daily config-driven TTL and GPS minimization jobs.</summary>
public sealed class RetentionWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<RetentionOptions> _options;
    private readonly ILogger<RetentionWorker> _logger;

    public RetentionWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<RetentionOptions> options,
        ILogger<RetentionWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var opts = _options.CurrentValue;
            if (!opts.Enabled)
            {
                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
                continue;
            }

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var retention = scope.ServiceProvider.GetRequiredService<IRetentionService>();
                await retention.RunAllJobsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "RetentionWorker iteration failed");
            }

            var hours = Math.Clamp(opts.IntervalHours, 1, 168);
            await Task.Delay(TimeSpan.FromHours(hours), stoppingToken);
        }
    }
}
