using FluentAssertions;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class VaultExtractedJsonParserTests
{
    [Fact]
    public void TryParseMedicalRecord_WhenItemsPresent_ReturnsTrue()
    {
        const string json = """
            {
              "petName": "Milo",
              "documentType": "vaccinations",
              "clinicName": "Beach Avenue Animal Hospital",
              "dateOfVisit": "2025-10-11",
              "items": [
                { "name": "DAPP", "category": "vaccination", "expiryDate": "2028-10-10" },
                { "name": "Bordetella", "category": "vaccination", "expiryDate": "2026-10-11" }
              ],
              "confidenceScore": 95
            }
            """;

        VaultExtractedJsonParser.TryParseMedicalRecord(json, out var record).Should().BeTrue();
        record!.Items.Should().HaveCount(2);
        record.DateOfVisit.Should().Be("2025-10-11");
    }

    [Fact]
    public void TryParseFlexible_WhenLegacyShape_ReturnsTrue()
    {
        const string json = """
            {
              "title": "Certificate of Vaccination",
              "summary": "Rabies given",
              "primaryDate": "2025-10-11",
              "keyFacts": [{ "label": "Clinic", "value": "Main St Vet" }],
              "confidenceScore": 90
            }
            """;

        VaultExtractedJsonParser.TryParseFlexible(json, out var flex).Should().BeTrue();
        flex!.Title.Should().Be("Certificate of Vaccination");
    }
}
