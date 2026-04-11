using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;
using PawBuck.API.Models;
using Xunit;

namespace PawBuck.API.Tests.Configuration;

public class SupabaseOptionsPostConfigureTests
{
    [Fact]
    public void ConnectionStrings_DefaultConnection_wins_over_DATABASE_URL()
    {
        var oldDb = Environment.GetEnvironmentVariable("DATABASE_URL");
        var oldSupa = Environment.GetEnvironmentVariable("SUPABASE_CONNECTION_STRING");
        try
        {
            Environment.SetEnvironmentVariable(
                "DATABASE_URL",
                "Host=wrong-host.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.bad;Password=x;SSL Mode=Require");
            Environment.SetEnvironmentVariable("SUPABASE_CONNECTION_STRING", null);

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        ["ConnectionStrings:DefaultConnection"] =
                            "Host=aws-1-us-east-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.good;Password=p;SSL Mode=Require;Trust Server Certificate=true",
                    })
                .Build();

            var services = new ServiceCollection();
            services.AddHttpClient(SupabaseConnectionStringNormalizer.DohHttpClientName);
            using var sp = services.BuildServiceProvider();
            var httpFactory = sp.GetRequiredService<IHttpClientFactory>();

            var postConfigure = new SupabaseOptionsPostConfigure(
                config,
                httpFactory,
                NullLogger<SupabaseOptionsPostConfigure>.Instance);

            var options = new SupabaseOptions { PreferIpv4 = false };
            postConfigure.PostConfigure(Options.DefaultName, options);

            options.ConnectionString.Should().NotBeNull();
            options.ConnectionString!.Should().Contain("aws-1-us-east-1.pooler.supabase.com");
            options.ConnectionString.Should().Contain("postgres.good");
            options.ConnectionString.Should().NotContain("wrong-host");
        }
        finally
        {
            if (oldDb == null)
                Environment.SetEnvironmentVariable("DATABASE_URL", null);
            else
                Environment.SetEnvironmentVariable("DATABASE_URL", oldDb);
            if (oldSupa == null)
                Environment.SetEnvironmentVariable("SUPABASE_CONNECTION_STRING", null);
            else
                Environment.SetEnvironmentVariable("SUPABASE_CONNECTION_STRING", oldSupa);
        }
    }
}
