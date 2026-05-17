using FluentAssertions;
using PawBuck.API.Models;
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
                { "name": "DAPP", "category": "vaccination", "administeredDate": "2025-10-11", "expiryDate": "2028-10-10" },
                { "name": "Bordetella", "category": "vaccination", "administeredDate": "2025-10-11", "expiryDate": "2026-10-11" }
              ],
              "confidenceScore": 95
            }
            """;

        VaultExtractedJsonParser.TryParseMedicalRecord(json, out var record).Should().BeTrue();
        record!.Items.Should().HaveCount(2);
        record.DateOfVisit.Should().Be("2025-10-11");
    }

    [Fact]
    public void TryParseMedicalRecord_WhenOnlyDateOfVisit_ReturnsFalse()
    {
        const string json = """
            {
              "dateOfVisit": "2025-10-11",
              "clinicName": "Main St Vet"
            }
            """;

        VaultExtractedJsonParser.TryParseMedicalRecord(json, out _).Should().BeFalse();
    }

    [Fact]
    public void TryParseMedicalRecord_WhenHybridFlexibleFieldsAndItems_UsesItems()
    {
        const string json = """
            {
              "title": "Certificate of Vaccination",
              "summary": "DAPP and Rabies given",
              "dateOfVisit": "2025-10-11",
              "items": [
                { "name": "DAPP", "category": "vaccination", "administeredDate": "2025-10-11", "expiryDate": "2028-10-10" },
                { "name": "Rabies", "category": "vaccination", "expiryDate": "2028-07-04" }
              ]
            }
            """;

        VaultExtractedJsonParser.TryParseMedicalRecord(json, out var record).Should().BeTrue();
        record!.Items!.Select(i => i.Name).Should().BeEquivalentTo(["DAPP", "Rabies"]);
    }

    [Fact]
    public void TryGetMedicalItems_WhenFlexibleOnly_ReturnsEmptyItems()
    {
        const string json = """
            {
              "title": "Certificate of Vaccination",
              "summary": "Rabies given",
              "primaryDate": "2025-10-11"
            }
            """;

        VaultExtractedJsonParser.TryGetMedicalItems(
                json,
                out var items,
                out _,
                out _,
                out _,
                out _)
            .Should()
            .BeTrue();
        items.Should().BeEmpty();
        VaultExtractedJsonParser.TryParseMedicalRecord(json, out _).Should().BeFalse();
    }

    [Fact]
    public void FilterProvablyAdministeredVaccinations_ExcludesDueOnlyWithoutAdministeredDate()
    {
        var items = new[]
        {
            new MedicalRecordItem
            {
                Name = "DAPP",
                Category = "vaccination",
                AdministeredDate = "2025-10-11",
                ExpiryDate = "2028-10-10",
            },
            new MedicalRecordItem
            {
                Name = "Bordetella",
                Category = "vaccination",
                AdministeredDate = "2025-10-11",
                ExpiryDate = "2026-10-11",
            },
            new MedicalRecordItem
            {
                Name = "Rabies",
                Category = "vaccination",
                ExpiryDate = "2028-07-04",
            },
        };

        var filtered = VaultExtractedJsonParser.FilterProvablyAdministeredVaccinations(items);
        filtered.Select(i => i.Name).Should().BeEquivalentTo(["DAPP", "Bordetella"]);
    }

    [Fact]
    public void FilterVaccinationItems_ExcludesGenericTitlesAndNonVaccineCategories()
    {
        var items = new[]
        {
            new MedicalRecordItem { Name = "Certificate of Vaccination", Category = "vaccination" },
            new MedicalRecordItem { Name = "DAPP", Category = "vaccination" },
            new MedicalRecordItem { Name = "Chemistry panel", Category = "lab" },
            new MedicalRecordItem { Name = "Rabies", Category = "" },
        };

        var filtered = VaultExtractedJsonParser.FilterVaccinationItems(items);
        filtered.Select(i => i.Name).Should().BeEquivalentTo(["DAPP", "Rabies"]);
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
