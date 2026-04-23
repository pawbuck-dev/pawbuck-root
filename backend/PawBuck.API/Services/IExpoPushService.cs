namespace PawBuck.API.Services;

public interface IExpoPushService
{
    /// <summary>Send one notification to every distinct Expo token for <paramref name="userId"/>.</summary>
    Task SendToUserAsync(
        Guid userId,
        string title,
        string body,
        IReadOnlyDictionary<string, string>? data,
        CancellationToken cancellationToken = default);
}
