using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

/// <summary>
/// Documents expected sync routing for vaccination vault JSON (no database).
/// </summary>
public class PetDocumentClinicalSyncRoutingTests
{
    [Fact]
    public void VaccinationSync_ShouldUseMedicalPath_WhenItemsPresent()
    {
        const string json = """
            {
              "title": "Certificate of Vaccination",
              "dateOfVisit": "2025-10-11",
              "items": [
                { "name": "DAPP", "category": "vaccination", "expiryDate": "2028-10-10" },
                { "name": "Rabies", "category": "vaccination", "expiryDate": "2028-07-04" }
              ]
            }
            """;

        VaultExtractedJsonParser.TryParseMedicalRecord(json, out var medical).Should().BeTrue();
        VaultExtractedJsonParser.FilterVaccinationItems(medical!.Items!).Should().HaveCount(2);
    }

    [Fact]
    public void VaccinationSync_ShouldNotUseMedicalPath_WhenFlexibleOnly()
    {
        const string json = """
            {
              "title": "Certificate of Vaccination",
              "summary": "DAPP administered",
              "primaryDate": "2025-10-11"
            }
            """;

        VaultExtractedJsonParser.TryParseMedicalRecord(json, out _).Should().BeFalse();
        VaultExtractedJsonParser.TryParseFlexible(json, out var flex).Should().BeTrue();
        flex!.Title.Should().Be("Certificate of Vaccination");
    }
}
