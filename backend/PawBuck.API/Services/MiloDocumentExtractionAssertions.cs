using System.Text.Json;

namespace PawBuck.API.Services;

public sealed class MiloDocumentExtractionFixture
{
    public string Id { get; init; } = "";
    public string DocumentType { get; init; } = "";
    public string SchemaKind { get; init; } = "medical";
    public JsonElement Expected { get; init; }
    public IReadOnlyList<string>? RequiredFields { get; init; }
    public IReadOnlyDictionary<string, JsonElement>? KeyFieldEquals { get; init; }
    public int? MinItems { get; init; }
    public int? MaxConfidence { get; init; }
    public int? MinConfidence { get; init; }
}

public sealed class MiloDocumentExtractionEvalResult
{
    public bool Passed { get; init; }
    public IReadOnlyList<string> Failures { get; init; } = Array.Empty<string>();
}

public static class MiloDocumentExtractionAssertions
{
    private static readonly HashSet<string> MedicalRequired =
        new(StringComparer.Ordinal) { "petName", "documentType", "clinicName", "dateOfVisit", "items", "confidenceScore" };

    private static readonly HashSet<string> FlexibleRequired =
        new(StringComparer.Ordinal) { "title", "summary", "keyFacts", "confidenceScore" };

    public static MiloDocumentExtractionEvalResult Evaluate(MiloDocumentExtractionFixture fixture)
    {
        var failures = new List<string>();
        var expected = fixture.Expected;

        if (expected.ValueKind != JsonValueKind.Object)
        {
            failures.Add("expected must be a JSON object");
            return Fail(failures);
        }

        var schemaKind = fixture.SchemaKind?.Trim().ToLowerInvariant() ?? "medical";
        var required = fixture.RequiredFields?.ToList()
            ?? (schemaKind == "flexible"
                ? FlexibleRequired.ToList()
                : MedicalRequired.ToList());

        foreach (var field in required)
        {
            if (!expected.TryGetProperty(field, out var prop) ||
                prop.ValueKind == JsonValueKind.Null ||
                (prop.ValueKind == JsonValueKind.String && string.IsNullOrWhiteSpace(prop.GetString())))
                failures.Add($"missing or empty required field: {field}");
        }

        if (expected.TryGetProperty("documentType", out var docTypeProp) &&
            docTypeProp.ValueKind == JsonValueKind.String &&
            !string.Equals(docTypeProp.GetString(), fixture.DocumentType, StringComparison.OrdinalIgnoreCase))
            failures.Add($"documentType mismatch: expected {fixture.DocumentType}, got {docTypeProp.GetString()}");

        if (fixture.MinItems is int minItems &&
            expected.TryGetProperty("items", out var items) &&
            items.ValueKind == JsonValueKind.Array &&
            items.GetArrayLength() < minItems)
            failures.Add($"items count {items.GetArrayLength()} < min {minItems}");

        if (expected.TryGetProperty("confidenceScore", out var conf) &&
            conf.TryGetDecimal(out var score))
        {
            if (fixture.MinConfidence is int minConf && score < minConf)
                failures.Add($"confidenceScore {score} < min {minConf}");
            if (fixture.MaxConfidence is int maxConf && score > maxConf)
                failures.Add($"confidenceScore {score} > max {maxConf}");
        }

        if (fixture.KeyFieldEquals is { Count: > 0 } equals)
        {
            foreach (var (field, want) in equals)
            {
                if (!expected.TryGetProperty(field, out var actual))
                {
                    failures.Add($"keyFieldEquals missing field: {field}");
                    continue;
                }

                if (!JsonElementsEqual(actual, want))
                    failures.Add($"keyFieldEquals mismatch on {field}");
            }
        }

        if (schemaKind == "medical")
        {
            if (expected.TryGetProperty("dateOfVisit", out var visit) &&
                visit.ValueKind == JsonValueKind.String &&
                !IsIsoDate(visit.GetString()))
                failures.Add("dateOfVisit must be ISO YYYY-MM-DD");

            if (expected.TryGetProperty("items", out var itemArr) &&
                itemArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in itemArr.EnumerateArray())
                {
                    if (item.TryGetProperty("expiryDate", out var exp) &&
                        exp.ValueKind == JsonValueKind.String &&
                        !IsIsoDate(exp.GetString()))
                        failures.Add("item expiryDate must be ISO YYYY-MM-DD");
                }
            }
        }

        return new MiloDocumentExtractionEvalResult
        {
            Passed = failures.Count == 0,
            Failures = failures,
        };
    }

    private static MiloDocumentExtractionEvalResult Fail(IReadOnlyList<string> failures) =>
        new() { Passed = false, Failures = failures };

    private static bool IsIsoDate(string? value) =>
        !string.IsNullOrWhiteSpace(value) &&
        DateOnly.TryParseExact(value, "yyyy-MM-dd", out _);

    private static bool JsonElementsEqual(JsonElement a, JsonElement b) =>
        string.Equals(a.GetRawText(), b.GetRawText(), StringComparison.Ordinal);
}
