using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;

namespace PawBuck.API.Services;

/// <summary>Polls <c>pet_documents</c> and syncs clinical rows via <see cref="IPetDocumentClinicalSyncService"/>.</summary>
public sealed class DocumentSyncWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<DocumentSyncOptions> _options;
    private readonly ILogger<DocumentSyncWorker> _logger;

    public DocumentSyncWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<DocumentSyncOptions> options,
        ILogger<DocumentSyncWorker> logger)
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
                await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
                continue;
            }

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var sync = scope.ServiceProvider.GetRequiredService<IPetDocumentClinicalSyncService>();
                var n = await sync.ProcessPendingDocumentsAsync(opts.BatchSize, stoppingToken);
                if (n > 0)
                    _logger.LogInformation("DocumentSyncWorker synced {Count} pet_documents row(s)", n);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DocumentSyncWorker iteration failed");
            }

            var delaySec = Math.Clamp(opts.PollIntervalSeconds, 30, 3600);
            await Task.Delay(TimeSpan.FromSeconds(delaySec), stoppingToken);
        }
    }
}
