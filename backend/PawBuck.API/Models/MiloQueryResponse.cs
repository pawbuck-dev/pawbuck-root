namespace PawBuck.API.Models;

/// <summary>
/// Structured response from POST /api/milo/ask.
/// </summary>
public class MiloQueryResponse
{
    /// <summary>Answer text from Milo (from RAG context or General Help).</summary>
    public string Answer { get; set; } = string.Empty;

    /// <summary>Whether the answer was based on retrieved context (true) or General Help fallback (false).</summary>
    public bool UsedContext { get; set; }

    /// <summary>Optional source identifiers (e.g. documentation chunk IDs) when UsedContext is true.</summary>
    public IReadOnlyList<string>? SourceIds { get; set; }

    /// <summary>When UsedContext is false, indicates General Help state to avoid hallucination.</summary>
    public bool IsGeneralHelp { get; set; }
}
