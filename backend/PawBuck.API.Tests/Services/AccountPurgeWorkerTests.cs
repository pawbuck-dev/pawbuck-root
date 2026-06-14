using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using PawBuck.API.Configuration;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class AccountPurgeWorkerTests
{
    [Fact]
    public async Task Worker_purges_only_past_due_requests_from_service()
    {
        var userId = Guid.NewGuid();
        var erasure = new Mock<IAccountErasureService>();
        erasure
            .Setup(s => s.GetPastDueDeletionRequestsAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new AccountDeletionRequestRow(Guid.NewGuid(), userId, DateTimeOffset.UtcNow.AddDays(-1)),
            ]);
        erasure
            .Setup(s => s.PurgeUserAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AccountPurgeResult(userId, true, new Dictionary<string, long> { ["pets"] = 1 }, null));

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(erasure.Object);
        services.AddSingleton<IOptionsMonitor<AccountPurgeOptions>>(
            new TestOptionsMonitor(new AccountPurgeOptions
            {
                Enabled = true,
                PollIntervalMinutes = 60,
                BatchSize = 5,
                InitialDelaySeconds = 0,
            }));
        services.AddHostedService<AccountPurgeWorker>();

        await using var provider = services.BuildServiceProvider();
        var worker = provider.GetServices<IHostedService>().OfType<AccountPurgeWorker>().Single();

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(800));
        await worker.StartAsync(cts.Token);
        await Task.Delay(600, CancellationToken.None);
        await worker.StopAsync(CancellationToken.None);

        erasure.Verify(s => s.PurgeUserAsync(userId, It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }

    private sealed class TestOptionsMonitor(AccountPurgeOptions value) : IOptionsMonitor<AccountPurgeOptions>
    {
        public AccountPurgeOptions CurrentValue { get; } = value;
        public AccountPurgeOptions Get(string? name) => value;
        public IDisposable? OnChange(Action<AccountPurgeOptions, string?> listener) => null;
    }
}
