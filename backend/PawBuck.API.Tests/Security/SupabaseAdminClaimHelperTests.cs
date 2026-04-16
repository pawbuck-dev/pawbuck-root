using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using PawBuck.API.Models;
using PawBuck.API.Security;
using Xunit;

namespace PawBuck.API.Tests.Security;

public class SupabaseAdminClaimHelperTests
{
    [Fact]
    public void TryReadAppMetadataRoleFromJwtPayload_reads_supabase_style_app_metadata_object()
    {
        var payload =
            "{\"sub\":\"x\",\"iss\":\"https://fchxefstqvyrmogfesjw.supabase.co/auth/v1\",\"aud\":\"authenticated\",\"app_metadata\":{\"provider\":\"email\",\"providers\":[\"email\"],\"role\":\"admin\"}}";
        var payloadB64 = Base64UrlEncoder.Encode(Encoding.UTF8.GetBytes(payload));
        var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + payloadB64 + ".sig";
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        var ok = SupabaseAdminClaimHelper.TryReadAppMetadataRoleFromJwtPayload(jwt, out var role);
        Assert.True(ok);
        Assert.Equal("admin", role);
    }

    [Fact]
    public void TryAddPawbuckAdminClaim_adds_claim_when_payload_matches_supabase()
    {
        var payload =
            "{\"sub\":\"x\",\"iss\":\"https://fchxefstqvyrmogfesjw.supabase.co/auth/v1\",\"aud\":\"authenticated\",\"app_metadata\":{\"provider\":\"email\",\"providers\":[\"email\"],\"role\":\"admin\"}}";
        var payloadB64 = Base64UrlEncoder.Encode(Encoding.UTF8.GetBytes(payload));
        var token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + payloadB64 + ".sig";
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        var identity = new ClaimsIdentity();
        SupabaseAdminClaimHelper.TryAddPawbuckAdminClaim(
            identity,
            jwt,
            new AdminOptions { RequiredAppMetadataRole = "admin" });
        Assert.True(identity.HasClaim(SupabaseAdminClaimHelper.PawbuckAdminClaimType, SupabaseAdminClaimHelper.PawbuckAdminClaimValue));
    }

    [Theory]
    [InlineData("{\"role\":\"admin\"}", "admin", true)]
    [InlineData("{\"role\":\"user\"}", "admin", false)]
    [InlineData("{}", "admin", false)]
    [InlineData("not-json", "admin", false)]
    public void TryParseRoleFromJsonString_parses_role(string json, string required, bool expectParsed)
    {
        var ok = SupabaseAdminClaimHelper.TryParseRoleFromJsonString(json, out var role);
        Assert.Equal(expectParsed, ok && string.Equals(role, required, StringComparison.Ordinal));
    }
}
