using System.Text.Json;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface IJournalTreeCatalog
{
    IReadOnlyList<JournalTreeDefinitionDto> GetAll();
    JournalTreeDefinitionDto? TryGet(string treeId);
    JournalTreeDefinitionDto? ResolveByTopic(string userText);
}

public sealed class JournalTreeCatalog : IJournalTreeCatalog
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IReadOnlyDictionary<string, JournalTreeDefinitionDto> _byId;

    public JournalTreeCatalog(IWebHostEnvironment env, ILogger<JournalTreeCatalog> logger)
    {
        var dir = Path.Combine(env.ContentRootPath, "JournalTrees");
        var map = new Dictionary<string, JournalTreeDefinitionDto>(StringComparer.OrdinalIgnoreCase);
        if (Directory.Exists(dir))
        {
            foreach (var file in Directory.EnumerateFiles(dir, "*.json"))
            {
                try
                {
                    var json = File.ReadAllText(file);
                    var tree = JsonSerializer.Deserialize<JournalTreeDefinitionDto>(json, JsonOptions);
                    if (tree != null && !string.IsNullOrWhiteSpace(tree.TreeId))
                        map[tree.TreeId] = tree;
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to load journal tree {File}", file);
                }
            }
        }
        else
        {
            logger.LogWarning("JournalTrees directory missing at {Dir}", dir);
        }

        _byId = map;
        logger.LogInformation("Loaded {Count} journal decision trees", map.Count);
    }

    public IReadOnlyList<JournalTreeDefinitionDto> GetAll() => _byId.Values.ToList();

    public JournalTreeDefinitionDto? TryGet(string treeId) =>
        _byId.TryGetValue(treeId.Trim(), out var t) ? t : null;

    public JournalTreeDefinitionDto? ResolveByTopic(string userText)
    {
        var t = (userText ?? "").ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(t))
            return null;

        foreach (var tree in _byId.Values)
        {
            foreach (var key in tree.SymptomTaxonomy)
            {
                if (t.Contains(key, StringComparison.OrdinalIgnoreCase))
                    return tree;
            }
        }

        if (t.Contains("vomit") || t.Contains("diarr") || t.Contains("throw up"))
            return TryGet("vomiting_v1.5");
        if (t.Contains("letharg") || t.Contains("low energy") || t.Contains("tired"))
            return TryGet("lethargy_v1.5");
        if (t.Contains("appetite") || t.Contains("off food") || t.Contains("not eating"))
            return TryGet("appetite_v1.5");
        if (t.Contains("itch") || t.Contains("scratch"))
            return TryGet("itching_v1.5");
        if (t.Contains("limp") || t.Contains("lameness"))
            return TryGet("limping_v1.5");
        if (t.Contains("cough") || t.Contains("breath"))
            return TryGet("cough_v1.5");
        if (t.Contains("eye") || t.Contains("ear"))
            return TryGet("eye_ear_v1.5");
        if (t.Contains("behavior") || t.Contains("anxious") || t.Contains("aggressive"))
            return TryGet("behavior_change_v1.5");
        if (t.Contains("walk"))
            return TryGet("walk_v1.5");
        if (t.Contains("meal") || t.Contains("food"))
            return TryGet("meal_v1.5");

        return null;
    }
}
