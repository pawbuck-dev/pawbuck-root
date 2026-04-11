namespace PawBuck.API.Configuration;

/// <summary>
/// Builds the Supabase Auth JWT issuer URL (<c>iss</c> claim), e.g. <c>https://YOUR_REF.supabase.co/auth/v1</c>.
/// </summary>
public static class SupabaseJwtIssuer
{
    /// <summary>Returns <c>{supabaseProjectUrl}/auth/v1</c> with trailing slashes trimmed, or null if URL is empty.</summary>
    public static string? FromSupabaseUrl(string? supabaseUrl)
    {
        if (string.IsNullOrWhiteSpace(supabaseUrl))
            return null;
        var baseUrl = supabaseUrl.Trim().TrimEnd('/');
        return $"{baseUrl}/auth/v1";
    }
}
