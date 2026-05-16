using System.Globalization;
using System.Text.Json;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Parses <c>pet_documents.extracted_json</c> (medical record or legacy flexible).</summary>
public static class VaultExtractedJsonParser
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public static bool TryParseMedicalRecord(string? extractedJson, out MedicalRecordExtraction? record)
    {
        record = null;
        if (string.IsNullOrWhiteSpace(extractedJson))
            return false;

        try
        {
            var parsed = JsonSerializer.Deserialize<MedicalRecordExtraction>(extractedJson, JsonOptions);
            if (parsed?.Items is { Count: > 0 })
            {
                record = parsed;
                return true;
            }

            if (parsed != null && !string.IsNullOrWhiteSpace(parsed.DateOfVisit))
            {
                record = parsed;
                return true;
            }
        }
        catch (JsonException)
        {
            /* fall through */
        }

        return false;
    }

    public static bool TryParseFlexible(string? extractedJson, out FlexibleVaultExtraction? flexible)
    {
        flexible = null;
        if (string.IsNullOrWhiteSpace(extractedJson))
            return false;

        try
        {
            flexible = JsonSerializer.Deserialize<FlexibleVaultExtraction>(extractedJson, JsonOptions);
            return flexible != null;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    public static bool TryParseFlexibleDate(string? raw, out DateTime utc)
    {
        utc = default;
        if (string.IsNullOrWhiteSpace(raw))
            return false;
        if (DateTime.TryParse(raw.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dt))
        {
            utc = dt.Kind == DateTimeKind.Utc ? dt : dt.ToUniversalTime();
            return true;
        }

        return false;
    }

    public static DateTime? ParseOptionalDate(string? raw) =>
        TryParseFlexibleDate(raw, out var d) ? d : null;

    public static DateOnly? ParseOptionalDateOnly(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        if (DateOnly.TryParse(raw.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
            return d;
        if (TryParseFlexibleDate(raw, out var dt))
            return DateOnly.FromDateTime(dt.Date);
        return null;
    }
}
