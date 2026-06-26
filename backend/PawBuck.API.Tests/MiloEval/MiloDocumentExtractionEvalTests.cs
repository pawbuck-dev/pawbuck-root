using FluentAssertions;
using PawBuck.API.Services;
using PawBuck.API.Tests.MiloEval;
using Xunit;

namespace PawBuck.API.Tests.MiloEval;

public class MiloDocumentExtractionEvalTests
{
    public static IEnumerable<object[]> FixtureIds =>
        MiloEvalFixtureLoader.LoadDocumentFixtures().Select(f => new object[] { f.Id });

    [Theory]
    [MemberData(nameof(FixtureIds))]
    public void GoldenFixture_PassesSchemaAndKeyFieldChecks(string fixtureId)
    {
        var fixture = MiloEvalFixtureLoader.LoadDocumentFixtures().Single(f => f.Id == fixtureId);
        var result = MiloDocumentExtractionAssertions.Evaluate(fixture);
        result.Passed.Should().BeTrue($"fixture {fixtureId}: {string.Join("; ", result.Failures)}");
    }

    [Fact]
    public void DocumentExtractionFixtures_MeetPhase2MinimumCount()
    {
        var fixtures = MiloEvalFixtureLoader.LoadDocumentFixtures();
        fixtures.Count.Should().BeGreaterOrEqualTo(15);
        fixtures.Select(f => f.DocumentType).Distinct().Count().Should().BeGreaterOrEqualTo(7);
    }
}
