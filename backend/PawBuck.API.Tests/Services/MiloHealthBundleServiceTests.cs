using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloHealthBundleServiceTests
{
    [Fact]
    public async Task ProcessBundleAsync_throws_when_no_text_and_no_document()
    {
        var vision = new Mock<IMiloVisionService>();
        var facts = new Mock<IMiloPetFactsService>();
        var opts = Options.Create(new SupabaseOptions { ConnectionString = "Host=127.0.0.1;Username=x;Password=x;Database=x" });
        var sut = new MiloHealthBundleService(
            vision.Object,
            facts.Object,
            opts,
            NullLogger<MiloHealthBundleService>.Instance);

        var act = () => sut.ProcessBundleAsync(
            Guid.NewGuid(),
            "bearer",
            new MiloHealthBundleRequest { PetId = Guid.NewGuid(), TextNote = "   ", DocumentPath = null },
            default);

        await act.Should().ThrowAsync<ArgumentException>();
        vision.Verify(
            v => v.AnalyzeAndPersistAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<AnalyzePetDocumentRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
