using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;

namespace PawBuck.API.Services;

/// <summary>Purges accounts past the deactivation grace window.</summary>
public sealed class AccountPurgeWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<AccountPurgeOptions> _options;
    private readonly ILogger<AccountPurgeWorker> _logger;

    public AccountPurgeWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<AccountPurgeOptions> options,
        ILogger<AccountPurgeWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(Math.Clamp(_options.CurrentValue.InitialDelaySeconds, 0, 300)), stoppingToken);

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
                using var scope = _scopeFactory.CreateScope();
                var erasure = scope.ServiceProvider.GetRequiredService<IAccountErasureService>();
                var due = await erasure.GetPastDueDeletionRequestsAsync(opts.BatchSize, stoppingToken);

                foreach (var req in due)
                {
                    var result = await erasure.PurgeUserAsync(req.UserId, stoppingToken);
                    if (!result.Success)
                    {
                        _logger.LogWarning(
                            "Account purge failed for userId={UserId} requestId={RequestId} error={Error}",
                            req.UserId,
                            req.Id,
                            result.ErrorMessage);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AccountPurgeWorker iteration failed");
            }

            var delayMin = Math.Clamp(opts.PollIntervalMinutes, 1, 1440);
            await Task.Delay(TimeSpan.FromMinutes(delayMin), stoppingToken);
        }
    }
}
