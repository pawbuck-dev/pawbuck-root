using PawBuck.API.Security;
using Xunit;

namespace PawBuck.API.Tests.Security;

public class SupabaseAdminClaimHelperTests
{
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
