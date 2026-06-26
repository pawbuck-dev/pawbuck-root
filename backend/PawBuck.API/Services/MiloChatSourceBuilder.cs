using System.Text.Json;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Builds optional <see cref="MiloChatSourceDto"/> lists for Milo chat responses.</summary>
public static class MiloChatSourceBuilder
{
    public const string TypeDocumentation = "documentation";
    public const string TypeCurated = "curated";
    public const string TypePetRecord = "pet_record";

    public static MiloChatSourceDto FromDocumentationChunk(DocumentationChunk chunk)
    {
        var label = TryReadMetadataString(chunk.MetadataJson, "source_file") ?? "PawBuck help";
        var section = TryReadMetadataString(chunk.MetadataJson, "section");
        if (!string.IsNullOrWhiteSpace(section))
            label = $"{label} — {section}";

        return new MiloChatSourceDto
        {
            Type = TypeDocumentation,
            Id = chunk.Id.ToString("D"),
            Label = label,
        };
    }

    public static MiloChatSourceDto FromCuratedSnippet(MiloCuratedSnippetDto snippet) =>
        new()
        {
            Type = TypeCurated,
            Id = snippet.Id.ToString("D"),
            Label = $"{snippet.Topic}: {snippet.SourceAttribution}",
        };

    public static MiloChatSourceDto PetRecordSummary(string? petName) =>
        new()
        {
            Type = TypePetRecord,
            Label = string.IsNullOrWhiteSpace(petName)
                ? "Your pet's health records"
                : $"{petName}'s health records",
        };

    private static string? TryReadMetadataString(string? metadataJson, string key)
    {
        if (string.IsNullOrWhiteSpace(metadataJson))
            return null;
        try
        {
            using var doc = JsonDocument.Parse(metadataJson);
            if (doc.RootElement.TryGetProperty(key, out var el) && el.ValueKind == JsonValueKind.String)
                return el.GetString();
        }
        catch
        {
            // ignore malformed metadata
        }

        return null;
    }
}
