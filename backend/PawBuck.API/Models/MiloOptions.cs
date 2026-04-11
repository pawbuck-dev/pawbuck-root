namespace PawBuck.API.Models;

/// <summary>
/// Milo-related API options (internal service auth for Edge/partners).
/// </summary>
public class MiloOptions
{
    public const string SectionName = "Milo";

    /// <summary>
    /// When set, <c>GET /api/milo/curated-guidance</c> requires header <c>X-Pawbuck-Milo-Internal-Key</c> to match.
    /// </summary>
    public string? InternalServiceKey { get; set; }
}
