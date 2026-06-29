using FluentAssertions;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class MiloNudgeCopyServiceTests
{
    [Theory]
    [InlineData("senior_mobility_tip")]
    [InlineData("vac_due_soon")]
    public void TemplateFallback_ReturnsSafeCopy(string kind)
    {
        var body = MiloNudgeCopyService.BuildTemplateBody(new MiloNudgeCopyRequest
        {
            Kind = kind,
            PetName = "Milo",
            Facts = new Dictionary<string, string> { ["vaccineName"] = "Rabies" },
        });

        MiloNudgeCopyService.IsSafeCopy(body).Should().BeTrue();
        body.Should().Contain("Milo");
    }

    [Fact]
    public void IsSafeCopy_RejectsDiagnosisLanguage()
    {
        MiloNudgeCopyService.IsSafeCopy("Your pet has arthritis and needs steroids.").Should().BeFalse();
    }

    [Fact]
    public void SanitizeCopy_TruncatesLongOutput()
    {
        var longText = new string('a', 200);
        var cleaned = MiloNudgeCopyService.SanitizeCopy(longText);
        cleaned.Length.Should().BeLessOrEqualTo(140);
    }

    [Fact]
    public void IsMiloEligibleKind_ExcludesClinicalOverdueKinds()
    {
        MiloNudgeCopyService.IsMiloEligibleKind("vac_overdue").Should().BeFalse();
        MiloNudgeCopyService.IsMiloEligibleKind("vac_missing_required").Should().BeFalse();
    }
}
