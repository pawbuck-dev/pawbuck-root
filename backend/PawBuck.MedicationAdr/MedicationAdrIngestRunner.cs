using Microsoft.Extensions.Logging;

namespace PawBuck.MedicationAdr;

public sealed class ParsedAdrEntry
{
    public required string GenericName { get; init; }
    public IReadOnlyList<string> BrandNames { get; init; } = Array.Empty<string>();
    public required string LabelText { get; init; }
    public IReadOnlyList<string> SymptomTaxonomy { get; init; } = Array.Empty<string>();
    public decimal Confidence { get; init; }
}

public interface IMedicationAdrIngestRunner
{
    Task<IReadOnlyList<ParsedAdrEntry>> IngestDrugNamesAsync(
        IReadOnlyList<string> genericNames,
        CancellationToken cancellationToken = default);
}

public sealed class MedicationAdrIngestRunner : IMedicationAdrIngestRunner
{
    private readonly IDailyMedSplClient _client;
    private readonly ILogger<MedicationAdrIngestRunner> _logger;

    public MedicationAdrIngestRunner(IDailyMedSplClient client, ILogger<MedicationAdrIngestRunner> logger)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ParsedAdrEntry>> IngestDrugNamesAsync(
        IReadOnlyList<string> genericNames,
        CancellationToken cancellationToken = default)
    {
        var all = new List<ParsedAdrEntry>();
        foreach (var name in genericNames.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            try
            {
                var xml = await _client.FetchSplXmlByDrugNameAsync(name, cancellationToken);
                if (string.IsNullOrWhiteSpace(xml))
                {
                    _logger.LogWarning("No SPL XML for {Drug}", name);
                    continue;
                }

                var parsed = SplAdverseReactionParser.Parse(xml);
                var generic = parsed.GenericName ?? name.ToLowerInvariant();
                foreach (var paragraph in parsed.AdverseReactionParagraphs.Take(12))
                {
                    foreach (var mapping in SymptomTaxonomyMapper.MapText(paragraph))
                    {
                        all.Add(new ParsedAdrEntry
                        {
                            GenericName = generic,
                            BrandNames = parsed.BrandNames,
                            LabelText = mapping.Snippet,
                            SymptomTaxonomy = new[] { mapping.TaxonomyKey },
                            Confidence = mapping.Confidence,
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "DailyMed ingest failed for {Drug}", name);
            }
        }

        return all;
    }
}
