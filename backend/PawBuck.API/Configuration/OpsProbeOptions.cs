namespace PawBuck.API.Configuration;

/// <summary>Internal + external synthetic availability probes (admin metrics).</summary>
public sealed class OpsProbeOptions
{
    public const string SectionName = "OpsProbe";

    /// <summary>Run <see cref="OpsAvailabilityProbeWorker"/> on the API host.</summary>
    public bool Enabled { get; set; } = true;

    public int IntervalMinutes { get; set; } = 5;

    public int RetentionDays { get; set; } = 30;

    /// <summary>
    /// Shared secret for POST /api/internal/ops-probes/ingest (GitHub Actions synthetics).
    /// Falls back to <see cref="MiloOptions.InternalServiceKey"/> when empty.
    /// </summary>
    public string? ExternalIngestKey { get; set; }

    /// <summary>Optional user/pet for live journal start_checkin smoke (P3).</summary>
    public Guid? JournalCheckInUserId { get; set; }

    /// <summary>Optional user/pet for live journal start_checkin smoke (P3).</summary>
    public Guid? JournalCheckInPetId { get; set; }
}
