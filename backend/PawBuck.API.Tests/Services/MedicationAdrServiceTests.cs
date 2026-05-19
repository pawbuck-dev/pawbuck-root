using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MedicationAdrServiceTests
{
    [Fact]
    public async Task MatchForPetAsync_without_connection_string_returns_empty()
    {
        var svc = new MedicationAdrService(
            Options.Create(new SupabaseOptions { ConnectionString = null }),
            NullLogger<MedicationAdrService>.Instance);

        var result = await svc.MatchForPetAsync(
            Guid.NewGuid(),
            new[] { "vomiting" });

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task MatchForPetAsync_without_symptom_keys_returns_empty()
    {
        var svc = new MedicationAdrService(
            Options.Create(new SupabaseOptions { ConnectionString = "Host=localhost" }),
            NullLogger<MedicationAdrService>.Instance);

        var result = await svc.MatchForPetAsync(Guid.NewGuid(), Array.Empty<string>());

        result.Should().BeEmpty();
    }
}
