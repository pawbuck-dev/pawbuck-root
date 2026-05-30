using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

/// <summary>Guards review-inbox queue SQL stays aligned with list filter (consumer parity).</summary>
public class SupportQueuesServiceSqlTests
{
    [Fact]
    public void ReviewInboxOpenCountSql_IncludesCompletedFailuresAndProcessing()
    {
        SupportQueuesService.ReviewInboxOpenCountSql.Should().Contain("pe.status = 'completed'");
        SupportQueuesService.ReviewInboxOpenCountSql.Should().Contain("pe.status = 'processing'");
        SupportQueuesService.ReviewInboxOpenCountSql.Should().Contain("dismissed");
        SupportQueuesService.ReviewInboxOpenCountSql.Should().Contain("failure_reason");
    }

    [Fact]
    public void StuckProcessingCountSql_RequiresProcessingStatus()
    {
        SupportQueuesService.StuckProcessingCountSql.Should().Contain("pe.status = 'processing'");
    }
}
