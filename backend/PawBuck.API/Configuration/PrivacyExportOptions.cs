namespace PawBuck.API.Configuration;

public sealed class PrivacyExportOptions
{
    public const string SectionName = "PrivacyExport";

    public bool Enabled { get; set; } = true;
    public int PollIntervalMinutes { get; set; } = 5;
    public int BatchSize { get; set; } = 5;
    public int SignedUrlTtlSeconds { get; set; } = 604800; // 7 days
    public int ExportExpiresDays { get; set; } = 7;
    public string ExportBucket { get; set; } = "data-exports";
    public string MailgunDomain { get; set; } = "";
    public string MailgunApiKey { get; set; } = "";
    public string FromEmail { get; set; } = "privacy@pawbuck.com";
}
