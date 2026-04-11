namespace PawBuck.API.Models;

public class AdminOptions
{
    public const string SectionName = "Admin";

    /// <summary>Required in non-Development. Sent as <c>X-Admin-Api-Key</c> from the support dashboard.</summary>
    public string? ApiKey { get; set; }
}
