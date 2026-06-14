using FluentAssertions;
using Moq;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class PrivacyExportServiceTests
{
    [Fact]
    public void ExportTableNames_includes_inventory_export_tables()
    {
        var http = new Mock<IHttpClientFactory>();
        http.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(new HttpClient());

        var service = new PrivacyExportService(
            Microsoft.Extensions.Options.Options.Create(new PawBuck.API.Models.SupabaseOptions()),
            http.Object,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<PrivacyExportService>.Instance);

        var names = service.ExportTableNames;
        names.Should().Contain("pets");
        names.Should().Contain("walk_sessions");
        names.Should().Contain("pet_documents");
        names.Should().Contain("milo_journal_chat_turns");
        names.Should().Contain("vet_bookings");
        names.Should().Contain("user_preferences");
    }

    [Fact]
    public void BundleVersion_is_stable()
    {
        PrivacyExportService.BundleVersion.Should().Be("pawbuck-export-1");
    }
}
