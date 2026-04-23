namespace PawBuck.API.Configuration;

/// <summary>Background sync from <c>pet_documents</c> vault into clinical tables.</summary>
public sealed class DocumentSyncOptions
{
    public const string SectionName = "DocumentSync";

    /// <summary>When false, <see cref="DocumentSyncWorker"/> sleeps and does no DB work.</summary>
    public bool Enabled { get; set; }

    /// <summary>How often to poll for pending rows.</summary>
    public int PollIntervalSeconds { get; set; } = 180;

    /// <summary>Max vault rows to process per poll.</summary>
    public int BatchSize { get; set; } = 20;
}
