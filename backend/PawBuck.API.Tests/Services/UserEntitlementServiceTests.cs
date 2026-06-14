using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class UserEntitlementServiceTests
{
    [Fact]
    public async Task HasActivePremiumAsync_ReturnsFalse_WhenConnectionStringEmpty()
    {
        var opt = Options.Create(new SupabaseOptions { ConnectionString = "" });
        var sub = Options.Create(new SubscriptionOptions());
        var env = new TestHostEnvironment("Development");
        var svc = new UserEntitlementService(
            opt,
            sub,
            env,
            LoggerFactory.Create(_ => { }).CreateLogger<UserEntitlementService>());
        var result = await svc.HasActivePremiumAsync(Guid.NewGuid());
        Assert.False(result);
    }

    [Fact]
    public async Task AssertMiloConversationAllowedAsync_Throws_WhenConnectionMissingInProduction()
    {
        var opt = Options.Create(new SupabaseOptions { ConnectionString = "" });
        var sub = Options.Create(new SubscriptionOptions { EnforceMiloConversationCap = true });
        var env = new TestHostEnvironment("Production");
        var svc = new UserEntitlementService(
            opt,
            sub,
            env,
            LoggerFactory.Create(_ => { }).CreateLogger<UserEntitlementService>());

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.AssertMiloConversationAllowedAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task AssertAiJournalAllowedAsync_Skips_WhenConnectionMissingInDevelopment()
    {
        var opt = Options.Create(new SupabaseOptions { ConnectionString = "" });
        var sub = Options.Create(new SubscriptionOptions { EnforceAiJournalCap = true });
        var env = new TestHostEnvironment("Development");
        var svc = new UserEntitlementService(
            opt,
            sub,
            env,
            LoggerFactory.Create(_ => { }).CreateLogger<UserEntitlementService>());

        await svc.AssertAiJournalAllowedAsync(Guid.NewGuid());
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public TestHostEnvironment(string environmentName) => EnvironmentName = environmentName;

        public string EnvironmentName { get; set; }
        public string ApplicationName { get; set; } = "PawBuck.API.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            null!;
    }
}
