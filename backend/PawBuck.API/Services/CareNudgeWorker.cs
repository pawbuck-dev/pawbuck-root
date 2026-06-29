using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;

namespace PawBuck.API.Services;

/// <summary>Polls for proactive care push delivery (digest + time-sensitive vet reminders).</summary>
public sealed class CareNudgeWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<CareNudgesOptions> _options;
    private readonly ILogger<CareNudgeWorker> _logger;

    public CareNudgeWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<CareNudgesOptions> options,
        ILogger<CareNudgeWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
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
                var push = scope.ServiceProvider.GetRequiredService<ICareNudgePushService>();
                var result = await push.RunPushCycleAsync(stoppingToken);
                if (result.DigestsSent > 0 || result.VetRemindersSent > 0)
                {
                    _logger.LogInformation(
                        "CareNudgeWorker: users={Users} digests={Digests} vet={Vet}",
                        result.UsersProcessed,
                        result.DigestsSent,
                        result.VetRemindersSent);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CareNudgeWorker iteration failed");
            }

            var delayMin = Math.Clamp(_options.CurrentValue.PollIntervalMinutes, 5, 120);
            await Task.Delay(TimeSpan.FromMinutes(delayMin), stoppingToken);
        }
    }
}
