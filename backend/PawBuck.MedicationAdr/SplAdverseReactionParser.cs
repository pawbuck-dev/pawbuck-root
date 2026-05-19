using System.Xml.Linq;

namespace PawBuck.MedicationAdr;

public sealed class SplParseResult
{
    public string? GenericName { get; init; }
    public IReadOnlyList<string> BrandNames { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> AdverseReactionParagraphs { get; init; } = Array.Empty<string>();
}

/// <summary>Extracts adverse reaction narrative from HL7 SPL XML (DailyMed).</summary>
public static class SplAdverseReactionParser
{
    private static readonly XNamespace Spl = "urn:hl7-org:spl";
    private static readonly XNamespace Voc = "urn:hl7-org:v3";

    public static SplParseResult Parse(string xml)
    {
        var doc = XDocument.Parse(xml);
        var root = doc.Root ?? throw new InvalidOperationException("SPL root missing");

        var generic = root.Descendants(Spl + "ingredient")
            .Select(i => (string?)i.Element(Spl + "name") ?? i.Descendants(Voc + "name").FirstOrDefault()?.Value)
            .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n));

        var brands = root.Descendants(Spl + "name")
            .Select(e => e.Value?.Trim())
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(8)
            .ToList();

        var sections = root.Descendants(Spl + "section")
            .Where(s =>
            {
                var code = s.Element(Spl + "code");
                var display = code?.Attribute("displayName")?.Value ?? "";
                var id = code?.Attribute("code")?.Value ?? "";
                return display.Contains("ADVERSE", StringComparison.OrdinalIgnoreCase)
                       || display.Contains("WARNING", StringComparison.OrdinalIgnoreCase)
                       || id.Contains("34084-4", StringComparison.Ordinal)
                       || id.Contains("34071-1", StringComparison.Ordinal);
            })
            .Select(s => FlattenText(s))
            .Where(t => t.Length > 20)
            .Distinct()
            .ToList();

        return new SplParseResult
        {
            GenericName = generic?.Trim().ToLowerInvariant(),
            BrandNames = brands,
            AdverseReactionParagraphs = sections,
        };
    }

    private static string FlattenText(XElement section)
    {
        return string.Join(
            " ",
            section.Descendants().Where(e => e.Name.LocalName == "paragraph" || e.Name.LocalName == "content")
                .Select(e => e.Value.Trim())
                .Where(v => v.Length > 0));
    }
}
