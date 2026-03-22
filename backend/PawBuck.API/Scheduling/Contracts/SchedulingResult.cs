namespace PawBuck.API.Scheduling.Contracts;

/// <summary>
/// Uniform result for adapter/orchestrator operations (maps to HTTP in controllers).
/// </summary>
public sealed class SchedulingResult<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? ErrorCode { get; init; }
    public string? Message { get; init; }

    public static SchedulingResult<T> Ok(T data) => new() { Success = true, Data = data };

    public static SchedulingResult<T> Fail(string code, string message) =>
        new() { Success = false, ErrorCode = code, Message = message };
}
