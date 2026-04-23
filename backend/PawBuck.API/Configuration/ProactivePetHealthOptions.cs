namespace PawBuck.API.Configuration;

/// <summary>Daily proactive senior journal tip + Expo push.</summary>
public sealed class ProactivePetHealthOptions
{
    public const string SectionName = "ProactivePetHealth";

    public bool Enabled { get; set; }

    /// <summary>IANA id, e.g. <c>UTC</c> or <c>America/Los_Angeles</c>.</summary>
    public string TimeZoneId { get; set; } = "UTC";

    public int RunHourLocal { get; set; } = 8;

    public int SeniorAgeYears { get; set; } = 8;

    public int JournalLookbackHours { get; set; } = 48;

    /// <summary>Substring match (case-insensitive) on combined journal text.</summary>
    public string[] MobilityKeywords { get; set; } = ["stiffness", "slow"];

    public string NotificationTitle { get; set; } = "PawBuck";
}
