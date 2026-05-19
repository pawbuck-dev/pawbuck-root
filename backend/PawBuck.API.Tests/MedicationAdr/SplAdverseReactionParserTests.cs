using FluentAssertions;
using PawBuck.MedicationAdr;
using Xunit;

namespace PawBuck.API.Tests.MedicationAdr;

public class SplAdverseReactionParserTests
{
    [Fact]
    public void Parse_extracts_adverse_section_and_maps_vomiting()
    {
        const string xml = """
            <?xml version="1.0" encoding="UTF-8"?>
            <document xmlns="urn:hl7-org:spl">
              <name>Carprofen Tablets</name>
              <section>
                <code code="34084-4" displayName="ADVERSE REACTIONS"/>
                <paragraph>Vomiting and diarrhea have been reported in dogs.</paragraph>
              </section>
            </document>
            """;

        var result = SplAdverseReactionParser.Parse(xml);
        result.AdverseReactionParagraphs.Should().NotBeEmpty();
        var mappings = SymptomTaxonomyMapper.MapText(result.AdverseReactionParagraphs[0]);
        mappings.Should().Contain(m => m.TaxonomyKey == "vomiting");
    }
}
