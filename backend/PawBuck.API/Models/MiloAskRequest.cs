namespace PawBuck.API.Models;

/// <summary>
/// Request body for POST /api/milo/ask (RAG FAQ).
/// </summary>
public class MiloAskRequest
{
    /// <summary>User question for Milo FAQ.</summary>
    public string? Question { get; set; }
}
