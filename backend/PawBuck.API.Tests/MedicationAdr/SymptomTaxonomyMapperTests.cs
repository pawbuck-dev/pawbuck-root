using FluentAssertions;
using PawBuck.MedicationAdr;
using Xunit;

namespace PawBuck.API.Tests.MedicationAdr;

public class SymptomTaxonomyMapperTests
{
    [Theory]
    [InlineData("oclacitinib may cause vomiting", "vomiting")]
    [InlineData("lethargy and depression", "lethargy")]
    [InlineData("pruritus and scratching", "pruritus")]
    public void MapText_maps_known_symptoms(string text, string expectedKey)
    {
        var maps = SymptomTaxonomyMapper.MapText(text);
        maps.Should().Contain(m => m.TaxonomyKey == expectedKey);
        maps.First(m => m.TaxonomyKey == expectedKey).Confidence.Should().BeGreaterThan(0.85m);
    }
}
