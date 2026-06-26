using System.Text.Json;
using System.Text.Json.Serialization;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Tests.MiloEval;

internal static class MiloEvalPaths
{
    internal static string RepoRoot
    {
        get
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            while (dir != null)
            {
                if (Directory.Exists(Path.Combine(dir.FullName, "eval", "milo")))
                    return dir.FullName;
                dir = dir.Parent;
            }

            throw new InvalidOperationException($"Could not locate eval/milo from {AppContext.BaseDirectory}");
        }
    }

    internal static string EvalRoot => Path.Combine(RepoRoot, "eval", "milo");

    internal static string Resolve(params string[] segments)
    {
        var copied = Path.Combine(AppContext.BaseDirectory, "MiloEval", Path.Combine(segments));
        if (File.Exists(copied))
            return copied;

        var source = Path.Combine(EvalRoot, Path.Combine(segments));
        if (File.Exists(source))
            return source;

        throw new FileNotFoundException($"Milo eval file not found: {string.Join('/', segments)}", source);
    }

    internal static string JournalTreePath(string treeId) =>
        Path.Combine(RepoRoot, "packages", "milo-journal-trees", "trees", $"{treeId}.json");

    internal static JsonSerializerOptions JsonOptions { get; } = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };
}

internal static class MiloEvalFixtureLoader
{
    internal static IReadOnlyList<MiloDocumentExtractionFixture> LoadDocumentFixtures()
    {
        var path = MiloEvalPaths.Resolve("document-extraction", "fixtures.json");
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<List<MiloDocumentExtractionFixture>>(json, MiloEvalPaths.JsonOptions)
            ?? throw new InvalidOperationException("document-extraction/fixtures.json is empty");
    }

    internal static IReadOnlyList<MiloChatSafetyScenario> LoadChatSafetyScenarios()
    {
        var path = MiloEvalPaths.Resolve("chat-safety", "scenarios.json");
        var json = File.ReadAllText(path);
        var root = JsonSerializer.Deserialize<ChatSafetyRoot>(json, MiloEvalPaths.JsonOptions)
            ?? throw new InvalidOperationException("chat-safety/scenarios.json is invalid");
        return root.Scenarios;
    }

    internal static IReadOnlyList<JournalRedFlagScenario> LoadJournalRedFlagScenarios()
    {
        var path = MiloEvalPaths.Resolve("journal-red-flags", "scenarios.json");
        var json = File.ReadAllText(path);
        var root = JsonSerializer.Deserialize<JournalRedFlagRoot>(json, MiloEvalPaths.JsonOptions)
            ?? throw new InvalidOperationException("journal-red-flags/scenarios.json is invalid");
        return root.Scenarios;
    }

    internal static IReadOnlyList<VetNotificationEvalExample> LoadVetNotificationExamples()
    {
        var path = MiloEvalPaths.Resolve("journal-red-flags", "vet-notification-examples.json");
        var json = File.ReadAllText(path);
        var root = JsonSerializer.Deserialize<VetNotificationEvalRoot>(json, MiloEvalPaths.JsonOptions)
            ?? throw new InvalidOperationException("vet-notification-examples.json is invalid");
        return root.Examples;
    }

    internal sealed class ChatSafetyRoot
    {
        [JsonPropertyName("scenarios")]
        public List<MiloChatSafetyScenario> Scenarios { get; init; } = new();
    }

    internal sealed class JournalRedFlagRoot
    {
        [JsonPropertyName("scenarios")]
        public List<JournalRedFlagScenario> Scenarios { get; init; } = new();
    }

    internal sealed class VetNotificationEvalRoot
    {
        [JsonPropertyName("examples")]
        public List<VetNotificationEvalExample> Examples { get; init; } = new();
    }
}

internal sealed class JournalRedFlagScenario
{
    public string Id { get; init; } = "";
    public string Mode { get; init; } = "";
    public string? TreeId { get; init; }
    public Dictionary<string, string[]>? Answers { get; init; }
    public string? UserMessage { get; init; }
    public string? ModelAnswerToken { get; init; }
    public bool ExpectEmergencyStop { get; init; }
    public bool ExpectSessionComplete { get; init; }
    public bool ExpectEmergency { get; init; }
}

internal sealed class VetNotificationEvalExample
{
    public string Id { get; init; } = "";
    public MiloVetNotificationDraftRequest Request { get; init; } = new();
    public VetNotificationEvalExpect Expect { get; init; } = new();
}

internal sealed class VetNotificationEvalExpect
{
    public IReadOnlyList<string>? SubjectMustNotContain { get; init; }
    public IReadOnlyList<string>? BodyMustNotContain { get; init; }
    public IReadOnlyList<string>? BodyMustContain { get; init; }
    public int? SubjectMaxLength { get; init; }
}
