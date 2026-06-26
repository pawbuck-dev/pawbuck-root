using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Tests.Services;

/// <summary>Shared Gemini HTTP stubs for Milo service tests.</summary>
internal static class GeminiTestSupport
{
    internal static IGeminiGenerateContentService CreateGenerateService(HttpMessageHandler handler)
    {
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("Gemini")).Returns(() => new HttpClient(handler, disposeHandler: true));
        var telemetry = new GeminiTelemetryRecorder(NullLogger<GeminiTelemetryRecorder>.Instance);
        return new GeminiGenerateContentService(
            factory.Object,
            telemetry,
            NullLogger<GeminiGenerateContentService>.Instance);
    }

    internal static IMiloCuratedSnippetsService EmptyCuratedSnippets()
    {
        var mock = new Mock<IMiloCuratedSnippetsService>();
        mock.Setup(s => s.GetGuidanceAsync(
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<MiloCuratedSnippetDto>());
        return mock.Object;
    }
}
