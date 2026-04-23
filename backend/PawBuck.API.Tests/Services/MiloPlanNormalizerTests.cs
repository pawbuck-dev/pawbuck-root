using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloPlanNormalizerTests
{
    private readonly ILogger _log = NullLogger.Instance;

    [Fact]
    public void NormalizeDataNeeded_HealthSummary_ReturnsSummaryThenJournal()
    {
        var list = new[] { MiloPetFactsKinds.Vaccinations, MiloPetFactsKinds.HealthSummary, MiloPetFactsKinds.Medications };
        var result = MiloPlanNormalizer.NormalizeDataNeeded(list, _log);
        result.Should().Equal(MiloPetFactsKinds.HealthSummary, MiloPetFactsKinds.Journal);
    }

    [Fact]
    public void NormalizeDataNeeded_NoneAndUnknown_IgnoresUnknownAndNone()
    {
        var list = new[] { "none", "not-a-real-kind", MiloPetFactsKinds.Vaccinations };
        var result = MiloPlanNormalizer.NormalizeDataNeeded(list, _log);
        result.Should().BeEquivalentTo(new[] { MiloPetFactsKinds.Vaccinations });
    }

    [Fact]
    public void NormalizeDataNeeded_Deduplicates()
    {
        var list = new[] { MiloPetFactsKinds.Vaccinations, MiloPetFactsKinds.Vaccinations, MiloPetFactsKinds.Medications };
        var result = MiloPlanNormalizer.NormalizeDataNeeded(list, _log);
        result.Should().HaveCount(2);
        result.Should().Contain(MiloPetFactsKinds.Vaccinations);
        result.Should().Contain(MiloPetFactsKinds.Medications);
    }
}
