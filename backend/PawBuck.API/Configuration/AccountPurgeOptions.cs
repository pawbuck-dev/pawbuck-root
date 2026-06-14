namespace PawBuck.API.Configuration;

/// <summary>Account purge after deactivation grace window.</summary>
public sealed class AccountPurgeOptions
{
    public const string SectionName = "AccountPurge";

    public bool Enabled { get; set; } = true;

    /// <summary>How often to scan for past-due deletion requests.</summary>
    public int PollIntervalMinutes { get; set; } = 15;

    /// <summary>Delay before first purge scan after API startup.</summary>
    public int InitialDelaySeconds { get; set; } = 45;

    /// <summary>Max accounts purged per worker iteration.</summary>
    public int BatchSize { get; set; } = 10;

    /// <summary>Storage buckets cleaned under <c>{userId}/</c> prefix during purge.</summary>
    public string[] UserPrefixBuckets { get; set; } =
    [
        "pets",
        "email-attachments",
        "pending-emails",
    ];

    /// <summary>Vault bucket for pet_documents (paths from DB before erase).</summary>
    public string PetDocumentsBucket { get; set; } = "pet-documents";
}
