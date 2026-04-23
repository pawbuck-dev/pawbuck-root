namespace PawBuck.API.Services;

/// <summary>Thrown when Gemini returns 429; <see cref="RetryAfter"/> may be taken from Retry-After response header.</summary>
public sealed class GeminiRateLimitException : Exception
{
    public TimeSpan? RetryAfter { get; }

    public GeminiRateLimitException(string message, TimeSpan? retryAfter, Exception? inner = null)
        : base(message, inner)
    {
        RetryAfter = retryAfter;
    }
}
