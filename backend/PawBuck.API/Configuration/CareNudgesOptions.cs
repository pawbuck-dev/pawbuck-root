namespace PawBuck.API.Configuration;

/// <summary>Proactive care nudge engine (in-app rules + push digest/worker).</summary>
public sealed class CareNudgesOptions
{
    public const string SectionName = "CareNudges";

    public bool Enabled { get; set; }

    public bool PushEnabled { get; set; }

    public int MaxClinicalPushesPerUserPerDay { get; set; } = 3;

    public int PollIntervalMinutes { get; set; } = 15;

    /// <summary>Local hour for daily digest (IANA timezone).</summary>
    public int DigestRunHourLocal { get; set; } = 9;

    public string TimeZoneId { get; set; } = "UTC";

    public int SeniorAgeYears { get; set; } = 8;

    public int JournalLookbackHours { get; set; } = 48;

    public string[] MobilityKeywords { get; set; } = ["stiffness", "slow"];

    public string DigestNotificationTitle { get; set; } = "PawBuck";
}
