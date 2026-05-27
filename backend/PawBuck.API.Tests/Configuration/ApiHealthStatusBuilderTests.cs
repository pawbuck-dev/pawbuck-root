using FluentAssertions;
using PawBuck.API.Configuration;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Configuration;

public class ApiHealthStatusBuilderTests
{
    [Fact]
    public void BuildAdminOpsHealth_allConfigured_returnsAllReady()
    {
        var result = ApiHealthStatusBuilder.BuildAdminOpsHealth(
            new MiloOptions { InternalServiceKey = "secret" },
            new SupabaseOptions
            {
                Url = "https://example.supabase.co",
                ServiceRoleKey = "service",
                ConnectionString = "Host=localhost",
            },
            new GeminiOptions { ApiKey = "gemini" });

        result.AllReady.Should().BeTrue();
        result.Checks.Should().OnlyContain(c => c.Ok);
    }

    [Fact]
    public void BuildAdminOpsHealth_missingMilo_returnsHint()
    {
        var result = ApiHealthStatusBuilder.BuildAdminOpsHealth(
            new MiloOptions(),
            new SupabaseOptions { Url = "https://x", ServiceRoleKey = "k", ConnectionString = "cs" },
            new GeminiOptions { ApiKey = "g" });

        result.AllReady.Should().BeFalse();
        result.Checks.Should().Contain(c => c.Id == "miloAnalyzeInternal" && !c.Ok);
    }
}
