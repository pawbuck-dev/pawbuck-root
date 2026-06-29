namespace PawBuck.API.Models;

public sealed class MiloNudgeCopyRequest
{
    public required string Kind { get; init; }
    public required string PetName { get; init; }
    public IReadOnlyDictionary<string, string> Facts { get; init; } = new Dictionary<string, string>();
    public string? JournalContext { get; init; }
}

public sealed class MiloNudgeCopyResponse
{
    public required string Body { get; init; }
    public required bool UsedMilo { get; init; }
    public required bool UsedFallback { get; init; }
}
