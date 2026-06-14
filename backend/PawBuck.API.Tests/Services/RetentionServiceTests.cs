using FluentAssertions;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class RetentionServiceTests
{
    [Fact]
    public void RetentionOptions_has_sensible_defaults()
    {
        var opts = new PawBuck.API.Configuration.RetentionOptions();
        opts.WalkGpsDays.Should().Be(90);
        opts.ProcessedEmailsDays.Should().Be(180);
        opts.MiloJournalTurnsMonths.Should().Be(12);
        opts.AnalyticsEventsMonths.Should().Be(14);
        opts.ExportFilesDays.Should().Be(7);
    }
}
