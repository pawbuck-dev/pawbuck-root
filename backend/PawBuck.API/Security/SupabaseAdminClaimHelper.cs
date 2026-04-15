using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using PawBuck.API.Models;

namespace PawBuck.API.Security;

/// <summary>
/// Maps Supabase access token <c>app_metadata.role</c> to a claim the <see cref="AdminSupportAuthorizationHandler"/> can check.
/// </summary>
public static class SupabaseAdminClaimHelper
{
    public const string PawbuckAdminClaimType = "pawbuck_admin";
    public const string PawbuckAdminClaimValue = "true";

    public static void TryAddPawbuckAdminClaim(ClaimsIdentity identity, JwtSecurityToken jwt, AdminOptions options)
    {
        var required = string.IsNullOrWhiteSpace(options.RequiredAppMetadataRole)
            ? "admin"
            : options.RequiredAppMetadataRole.Trim();

        if (!jwt.Payload.TryGetValue("app_metadata", out var raw))
            return;

        string? role = null;
        switch (raw)
        {
            case JsonElement je:
                if (je.ValueKind == JsonValueKind.Object &&
                    je.TryGetProperty("role", out var r) &&
                    r.ValueKind == JsonValueKind.String)
                    role = r.GetString();
                break;
            case string s:
                TryParseRoleFromJsonString(s, out role);
                break;
            case Dictionary<string, object> dict:
                if (dict.TryGetValue("role", out var ro))
                    role = ro as string ?? ro?.ToString();
                break;
        }

        if (string.Equals(role, required, StringComparison.Ordinal))
            identity.AddClaim(new Claim(PawbuckAdminClaimType, PawbuckAdminClaimValue));
    }

    internal static bool TryParseRoleFromJsonString(string json, out string? role)
    {
        role = null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                doc.RootElement.TryGetProperty("role", out var r) &&
                r.ValueKind == JsonValueKind.String)
            {
                role = r.GetString();
                return true;
            }
        }
        catch (JsonException)
        {
            // ignore
        }

        return false;
    }
}
