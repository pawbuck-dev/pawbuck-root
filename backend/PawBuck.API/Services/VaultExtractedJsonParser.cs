using System.Globalization;
using System.Text.Json;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Parses <c>pet_documents.extracted_json</c> (medical record or legacy flexible).</summary>
public static class VaultExtractedJsonParser
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static readonly HashSet<string> GenericVaccineTitles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Certificate of Vaccination",
        "Vaccination Certificate",
        "Vaccination Record",
        "Vaccine Record",
        "Immunization Record",
    };

    public static bool TryParseMedicalRecord(string? extractedJson, out MedicalRecordExtraction? record)
    {
        record = null;
        if (string.IsNullOrWhiteSpace(extractedJson))
            return false;

        if (!TryGetMedicalItems(extractedJson, out var items, out var dateOfVisit, out var clinicName, out var petName, out var documentType))
            return false;

        if (items.Count == 0)
            return false;

        record = new MedicalRecordExtraction
        {
            PetName = petName,
            DocumentType = documentType,
            ClinicName = clinicName,
            DateOfVisit = dateOfVisit,
            Items = items,
        };

        try
        {
            using var doc = JsonDocument.Parse(extractedJson);
            if (doc.RootElement.TryGetProperty("confidenceScore", out var cs) && cs.TryGetDouble(out var score))
                record.ConfidenceScore = score;
        }
        catch (JsonException)
        {
            /* optional field */
        }

        return true;
    }

    /// <summary>
    /// Reads <c>items[]</c> from JSON even when the payload also contains flexible fields (title, summary, keyFacts).
    /// </summary>
    public static bool TryGetMedicalItems(
        string? extractedJson,
        out List<MedicalRecordItem> items,
        out string? dateOfVisit,
        out string? clinicName,
        out string? petName,
        out string? documentType)
    {
        items = new List<MedicalRecordItem>();
        dateOfVisit = null;
        clinicName = null;
        petName = null;
        documentType = null;

        if (string.IsNullOrWhiteSpace(extractedJson))
            return false;

        try
        {
            using var doc = JsonDocument.Parse(extractedJson);
            var root = doc.RootElement;

            petName = TryGetStringProperty(root, "petName");
            documentType = TryGetStringProperty(root, "documentType");
            clinicName = TryGetStringProperty(root, "clinicName");
            dateOfVisit = TryGetStringProperty(root, "dateOfVisit");

            if (!root.TryGetProperty("items", out var itemsEl) || itemsEl.ValueKind != JsonValueKind.Array)
                return true;

            foreach (var itemEl in itemsEl.EnumerateArray())
            {
                if (itemEl.ValueKind != JsonValueKind.Object)
                    continue;

                var name = TryGetStringProperty(itemEl, "name");
                if (string.IsNullOrWhiteSpace(name))
                    continue;

                items.Add(new MedicalRecordItem
                {
                    Name = name.Trim(),
                    Category = TryGetStringProperty(itemEl, "category") ?? "",
                    ExpiryDate = TryGetStringProperty(itemEl, "expiryDate"),
                });
            }

            return true;
        }
        catch (JsonException)
        {
            items = new List<MedicalRecordItem>();
            return false;
        }
    }

    public static bool IsGenericVaccineTitle(string? name) =>
        !string.IsNullOrWhiteSpace(name) && GenericVaccineTitles.Contains(name.Trim());

    public static bool IsVaccinationCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
            return true;

        return category.Contains("vaccin", StringComparison.OrdinalIgnoreCase)
               || category.Contains("immuniz", StringComparison.OrdinalIgnoreCase);
    }

    public static List<MedicalRecordItem> FilterVaccinationItems(IEnumerable<MedicalRecordItem> items) =>
        items
            .Where(i => !string.IsNullOrWhiteSpace(i.Name))
            .Where(i => IsVaccinationCategory(i.Category))
            .Where(i => !IsGenericVaccineTitle(i.Name))
            .ToList();

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

    private static string? TryGetStringProperty(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
            return null;

        return prop.ValueKind switch
        {
            JsonValueKind.String => string.IsNullOrWhiteSpace(prop.GetString()) ? null : prop.GetString()!.Trim(),
            JsonValueKind.Number => prop.GetRawText(),
            _ => null,
        };
    }
}
