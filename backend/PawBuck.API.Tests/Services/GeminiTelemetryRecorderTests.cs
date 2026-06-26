using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class GeminiTelemetryRecorderTests
{
    [Fact]
    public void Record_AggregatesByKind()
    {
        var recorder = new GeminiTelemetryRecorder(NullLogger<GeminiTelemetryRecorder>.Instance);
        recorder.Record(GeminiCallKind.ChatPlan, "gemini-2.5-flash", 100, success: true, new GeminiUsageMetadata { TotalTokenCount = 10 });
        recorder.Record(GeminiCallKind.ChatPlan, "gemini-2.5-flash", 50, success: false);
        recorder.Record(GeminiCallKind.EmbedQuery, "gemini-embedding-2", 20, success: true);

        var snapshot = recorder.GetSnapshot();
        snapshot.ByKind.Should().ContainKey(GeminiCallKind.ChatPlan);
        snapshot.ByKind[GeminiCallKind.ChatPlan].CallCount.Should().Be(2);
        snapshot.ByKind[GeminiCallKind.ChatPlan].SuccessCount.Should().Be(1);
        snapshot.ByKind[GeminiCallKind.ChatPlan].FailureCount.Should().Be(1);
        snapshot.ByKind[GeminiCallKind.EmbedQuery].CallCount.Should().Be(1);
    }
}
