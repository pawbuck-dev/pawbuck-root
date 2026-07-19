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
                { "name": "DAPP", "category": "vaccination", "administeredDate": "2025-10-11", "expiryDate": "2028-10-10" },
                { "name": "Bordetella", "category": "vaccination", "administeredDate": "2025-10-11", "expiryDate": "2026-10-11" },
                { "name": "Leptospirosis", "category": "vaccination", "administeredDate": "2025-10-11", "expiryDate": "2026-10-11" },
                { "name": "Rabies", "category": "vaccination", "expiryDate": "2028-07-04" }
              ]
            }
            """;

        VaultExtractedJsonParser.TryParseMedicalRecord(json, out var medical).Should().BeTrue();
        VaultExtractedJsonParser.FilterVaccinationItems(medical!.Items!).Should().HaveCount(4);
        VaultExtractedJsonParser.FilterProvablyAdministeredVaccinations(medical.Items!)
            .Select(i => i.Name)
            .Should()
            .BeEquivalentTo(["DAPP", "Bordetella", "Leptospirosis"]);
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

    [Fact]
    public void ExplicitVaccinationCategory_RequiresVaccineWording()
    {
        // Unlike IsVaccinationCategory (lenient inside vaccination-classified docs),
        // the explicit check must NOT treat a missing category as a vaccine —
        // otherwise every exam item in a clinical document would be diverted.
        VaultExtractedJsonParser.IsExplicitVaccinationCategory("vaccination").Should().BeTrue();
        VaultExtractedJsonParser.IsExplicitVaccinationCategory("Vaccine").Should().BeTrue();
        VaultExtractedJsonParser.IsExplicitVaccinationCategory("immunization").Should().BeTrue();
        VaultExtractedJsonParser.IsExplicitVaccinationCategory(null).Should().BeFalse();
        VaultExtractedJsonParser.IsExplicitVaccinationCategory("").Should().BeFalse();
        VaultExtractedJsonParser.IsExplicitVaccinationCategory("procedure").Should().BeFalse();
        VaultExtractedJsonParser.IsExplicitVaccinationCategory("checkup").Should().BeFalse();
    }

    [Fact]
    public void ClinicalExamDoc_WithVaccineItems_PartitionsVaccinesOutOfExamRows()
    {
        // A single "clinical visit" document (e.g. supertails+ Junior visit) that also
        // lists administered vaccines: vaccine items must route to public.vaccinations,
        // not render as clinical exam cards.
        const string json = """
            {
              "documentType": "clinical_exams",
              "clinicName": "supertails+",
              "dateOfVisit": "2026-07-12",
              "items": [
                { "name": "Physical examination", "category": "checkup" },
                { "name": "Leptospirosis", "category": "vaccination", "administeredDate": "2026-07-12", "expiryDate": "2027-07-12" },
                { "name": "DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)", "category": "vaccination", "administeredDate": "2026-07-12" }
              ]
            }
            """;

        VaultExtractedJsonParser.TryParseMedicalRecord(json, out var medical).Should().BeTrue();

        var (vaccinations, others) = VaultExtractedJsonParser.PartitionExplicitVaccinationItems(medical!.Items!);

        vaccinations.Select(i => i.Name).Should().BeEquivalentTo(
            ["Leptospirosis", "DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)"]);
        others.Select(i => i.Name).Should().BeEquivalentTo(["Physical examination"]);
    }

    [Fact]
    public void ClinicalExamDoc_WithoutCategories_KeepsAllItemsAsExamRows()
    {
        var items = new List<MedicalRecordItem>
        {
            new() { Name = "Physical examination", Category = "" },
            new() { Name = "Dental check", Category = "" },
        };

        var (vaccinations, others) = VaultExtractedJsonParser.PartitionExplicitVaccinationItems(items);

        vaccinations.Should().BeEmpty();
        others.Should().HaveCount(2);
    }

    [Fact]
    public void Partition_DropsGenericVaccineTitles_FromVaccinationSide()
    {
        var items = new List<MedicalRecordItem>
        {
            new() { Name = "Vaccination Record", Category = "vaccination" },
            new() { Name = "Rabies", Category = "vaccination", AdministeredDate = "2026-07-12" },
        };

        var (vaccinations, others) = VaultExtractedJsonParser.PartitionExplicitVaccinationItems(items);

        vaccinations.Select(i => i.Name).Should().BeEquivalentTo(["Rabies"]);
        others.Should().BeEmpty();
    }
}
