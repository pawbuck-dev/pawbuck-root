using FluentAssertions;
using PawBuck.API.Configuration;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Configuration;

public class ApiHealthStatusBuilderTests
{
    [Fact]
    public void MailResolveConfigured_requires_url_and_service_role()
    {
        var none = ApiHealthStatusBuilder.Build(
            new MiloOptions(),
            new SupabaseOptions(),
            new GeminiOptions());
        AssertFlag(none, "mailResolveConfigured", false);
        AssertFlag(none, "supabaseUrlConfigured", false);
        AssertFlag(none, "supabaseServiceRoleConfigured", false);

        var urlOnly = ApiHealthStatusBuilder.Build(
            new MiloOptions(),
            new SupabaseOptions { Url = "https://ref.supabase.co" },
            new GeminiOptions());
        AssertFlag(urlOnly, "mailResolveConfigured", false);
        AssertFlag(urlOnly, "supabaseUrlConfigured", true);
        AssertFlag(urlOnly, "supabaseServiceRoleConfigured", false);

        var both = ApiHealthStatusBuilder.Build(
            new MiloOptions(),
            new SupabaseOptions
            {
                Url = "https://ref.supabase.co",
                ServiceRoleKey = "eyJ.test",
            },
            new GeminiOptions());
        AssertFlag(both, "mailResolveConfigured", true);
        AssertFlag(both, "supabaseUrlConfigured", true);
        AssertFlag(both, "supabaseServiceRoleConfigured", true);
    }

    [Fact]
    public void Other_flags_reflect_milo_gemini_and_database()
    {
        var payload = ApiHealthStatusBuilder.Build(
            new MiloOptions { InternalServiceKey = "milo-key" },
            new SupabaseOptions
            {
                ConnectionString = "Host=localhost",
                JwtSecret = "jwt-secret",
            },
            new GeminiOptions { ApiKey = "AIza-test" });

        AssertFlag(payload, "miloAnalyzeInternalConfigured", true);
        AssertFlag(payload, "supabaseDatabaseConfigured", true);
        AssertFlag(payload, "supabaseJwtConfigured", true);
        AssertFlag(payload, "geminiConfigured", true);
        AssertFlag(payload, "status", "healthy");
    }

    private static void AssertFlag(object payload, string property, bool expected)
    {
        var prop = payload.GetType().GetProperty(property);
        prop.Should().NotBeNull(property);
        ((bool)prop!.GetValue(payload)!).Should().Be(expected);
    }

    private static void AssertFlag(object payload, string property, string expected)
    {
        var prop = payload.GetType().GetProperty(property);
        prop.Should().NotBeNull(property);
        prop!.GetValue(payload).Should().Be(expected);
    }
}
