using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;
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

        // Some JwtPayload deserializations omit nested app_metadata from the dictionary; RawPayload still matches the client JWT.
        jwt.Payload.TryGetValue("app_metadata", out var raw);

        string? role = null;
        switch (raw)
        {
            case JsonElement je:
                if (je.ValueKind == JsonValueKind.Object &&
                    je.TryGetProperty("role", out var r) &&
                    r.ValueKind == JsonValueKind.String)
                    role = r.GetString();
                else if (je.ValueKind == JsonValueKind.String)
                    TryParseRoleFromJsonString(je.GetString() ?? "", out role);
                break;
            case string s:
                TryParseRoleFromJsonString(s, out role);
                break;
            case Dictionary<string, object> dict:
                if (dict.TryGetValue("role", out var ro))
                {
                    role = ro switch
                    {
                        string s => s,
                        JsonElement re when re.ValueKind == JsonValueKind.String => re.GetString(),
                        _ => ro as string ?? ro?.ToString(),
                    };
                }

                break;
        }

        // JwtPayload sometimes deserializes app_metadata in a shape the switch misses; the raw payload matches browser devtools.
        if (string.IsNullOrEmpty(role))
            TryReadAppMetadataRoleFromJwtPayload(jwt, out role);

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

    /// <summary>
    /// Decodes the JWT payload segment and reads <c>app_metadata.role</c> (same JSON Supabase issues to the client).
    /// </summary>
    internal static bool TryReadAppMetadataRoleFromJwtPayload(JwtSecurityToken jwt, out string? role)
    {
        role = null;
        try
        {
            var segment = jwt.RawPayload;
            if (string.IsNullOrEmpty(segment))
                return false;
            var bytes = Base64UrlEncoder.DecodeBytes(segment);
            var json = Encoding.UTF8.GetString(bytes);
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("app_metadata", out var am))
                return false;
            if (am.ValueKind == JsonValueKind.Object &&
                am.TryGetProperty("role", out var r) &&
                r.ValueKind == JsonValueKind.String)
            {
                role = r.GetString();
                return !string.IsNullOrEmpty(role);
            }

            if (am.ValueKind == JsonValueKind.String)
                return TryParseRoleFromJsonString(am.GetString() ?? "", out role);
        }
        catch (JsonException)
        {
            // ignore
        }
        catch (FormatException)
        {
            // ignore
        }

        return false;
    }
}
