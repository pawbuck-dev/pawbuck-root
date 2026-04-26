using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface IMailInboxResolveService
{
    /// <summary>
    /// Re-invoke mailgun edge with pet + document overrides. Caller must be authenticated; pet must be owned.
    /// </summary>
    Task<MailInboxResolveResult> ResolveAsync(
        Guid userId,
        MailResolveRequest request,
        CancellationToken cancellationToken = default);
}

public sealed class MailInboxResolveResult
{
    public bool Ok { get; init; }
    public int StatusCode { get; init; }
    public string? Error { get; init; }
    public string? BodySnippet { get; init; }
}
