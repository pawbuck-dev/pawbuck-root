using System.Net.Http.Json;
using System.Text.Json;

namespace PawBuck.MedicationAdr;

public interface IDailyMedSplClient
{
    Task<string?> FetchSplXmlByDrugNameAsync(string drugName, CancellationToken cancellationToken = default);
}

public sealed class DailyMedSplClient : IDailyMedSplClient
{
    private static readonly Uri Base = new("https://dailymed.nlm.nih.gov/dailymed/services/v2/");
    private readonly HttpClient _http;

    public DailyMedSplClient(HttpClient http) => _http = http;

    public async Task<string?> FetchSplXmlByDrugNameAsync(string drugName, CancellationToken cancellationToken = default)
    {
        var searchUrl =
            new Uri(Base, $"spls.json?drug_name={Uri.EscapeDataString(drugName)}&pagesize=1");
        using var searchRes = await _http.GetAsync(searchUrl, cancellationToken);
        if (!searchRes.IsSuccessStatusCode)
            return null;

        await using var searchStream = await searchRes.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(searchStream, cancellationToken: cancellationToken);
        if (!doc.RootElement.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Array)
            return null;
        var first = data.EnumerateArray().FirstOrDefault();
        if (first.ValueKind == JsonValueKind.Undefined)
            return null;
        if (!first.TryGetProperty("setid", out var setIdEl))
            return null;
        var setId = setIdEl.GetString();
        if (string.IsNullOrWhiteSpace(setId))
            return null;

        var xmlUrl = new Uri(Base, $"spls/{setId}.xml");
        return await _http.GetStringAsync(xmlUrl, cancellationToken);
    }
}
