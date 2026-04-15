namespace PawBuck.API.Models;

public class AdminOptions
{
    public const string SectionName = "Admin";

    /// <summary>
    /// Supabase access token must include <c>app_metadata.role</c> matching this value (set in Dashboard → Authentication → Users, or via Admin API).
    /// </summary>
    public string RequiredAppMetadataRole { get; set; } = "admin";

    /// <summary>
    /// When true, <b>Development</b> only: support routes allow requests without a JWT (local admin UI without Supabase sign-in). Never enable in Production.
    /// </summary>
    public bool AllowAnonymousSupportInDevelopment { get; set; }
}
