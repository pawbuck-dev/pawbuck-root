using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PawBuck.API.Scheduling;
using PawBuck.API.Scheduling.Contracts;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Scheduling;

public class CompositeClinicSchedulingConfigProviderTests
{
    private static readonly Guid DemoClinicId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    [Fact]
    public async Task GetAsync_WhenSupabaseDisabled_UsesConfigurationOnly()
    {
        var scheduling = new TestOptionsMonitor<SchedulingRoutingOptions>(new SchedulingRoutingOptions
        {
            UseSupabaseClinicConfig = false,
            Clinics =
            {
                new ClinicSchedulingRouteEntry
                {
                    ClinicId = DemoClinicId,
                    Provider = BookingProviderKind.PawBuckDemo,
                    ExternalClinicId = "mock-vet-1"
                }
            }
        });

        var supabase = new TestOptionsMonitor<SupabaseOptions>(new SupabaseOptions
        {
            ConnectionString = "Host=127.0.0.1;Port=65432" // unused when flag false
        });

        var composite = new CompositeClinicSchedulingConfigProvider(
            scheduling,
            supabase,
            new SupabaseClinicSchedulingConfigProvider(
                supabase,
                NullLogger<SupabaseClinicSchedulingConfigProvider>.Instance),
            new ConfigurationClinicSchedulingConfigProvider(scheduling));

        var result = await composite.GetAsync(DemoClinicId, CancellationToken.None);

        result.Should().NotBeNull();
        result!.ProviderKind.Should().Be(BookingProviderKind.PawBuckDemo);
        result.ExternalClinicId.Should().Be("mock-vet-1");
    }

    [Fact]
    public async Task GetAsync_WhenSupabaseEnabledButConnectionStringEmpty_FallsBackToConfiguration()
    {
        var scheduling = new TestOptionsMonitor<SchedulingRoutingOptions>(new SchedulingRoutingOptions
        {
            UseSupabaseClinicConfig = true,
            Clinics =
            {
                new ClinicSchedulingRouteEntry
                {
                    ClinicId = DemoClinicId,
                    Provider = BookingProviderKind.PawBuckDemo,
                    ExternalClinicId = "cfg-fallback"
                }
            }
        });

        var supabase = new TestOptionsMonitor<SupabaseOptions>(new SupabaseOptions { ConnectionString = "" });

        var composite = new CompositeClinicSchedulingConfigProvider(
            scheduling,
            supabase,
            new SupabaseClinicSchedulingConfigProvider(
                supabase,
                NullLogger<SupabaseClinicSchedulingConfigProvider>.Instance),
            new ConfigurationClinicSchedulingConfigProvider(scheduling));

        var result = await composite.GetAsync(DemoClinicId, CancellationToken.None);

        result.Should().NotBeNull();
        result!.ExternalClinicId.Should().Be("cfg-fallback");
    }

    private sealed class TestOptionsMonitor<T> : IOptionsMonitor<T>
        where T : class
    {
        public TestOptionsMonitor(T value) => CurrentValue = value;

        public T CurrentValue { get; }

        public T Get(string? name) => CurrentValue;

        public IDisposable? OnChange(Action<T, string?> listener) => null;
    }
}
