namespace PawBuck.API.Models;

/// <summary>Aggregated counts for admin command center and sidebar badges.</summary>
public class SupportQueuesSummaryResponse
{
    public DateTimeOffset AsOf { get; set; }

    /// <summary>Open review-inbox rows (consumer-parity visibility; no date window).</summary>
    public int ReviewInboxOpen { get; set; }

    /// <summary><c>processed_emails.status = processing</c> not dismissed/resolved.</summary>
    public int StuckProcessing { get; set; }

    /// <summary>Completed failures in the last 30 UTC days.</summary>
    public int MailFailuresLast30Days { get; set; }

    /// <summary>Admin ops-health checks that are not ready.</summary>
    public int OpsChecksFailing { get; set; }

    public bool OpsAllReady { get; set; }
}
