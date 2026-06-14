namespace PawBuck.API.Configuration;

/// <summary>Config-driven data retention TTL jobs.</summary>
public sealed class RetentionOptions
{
    public const string SectionName = "Retention";

    public bool Enabled { get; set; } = true;

    /// <summary>How often the worker runs all jobs.</summary>
    public int IntervalHours { get; set; } = 24;

    public int WalkGpsDays { get; set; } = 90;
    public int ProcessedEmailsDays { get; set; } = 180;
    public int MiloJournalTurnsMonths { get; set; } = 12;
    public int AnalyticsEventsMonths { get; set; } = 14;
    public int ExportFilesDays { get; set; } = 7;
    public int DeletionLogMonths { get; set; } = 24;
    public int RetentionJobRunsDays { get; set; } = 90;
}
