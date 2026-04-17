using Microsoft.Extensions.Options;
using PawBuck.API.Models;
using PawBuck.API.Services;
using Xunit;

namespace PawBuck.API.Tests.Services;

public class UserEntitlementServiceTests
{
    [Fact]
    public async Task HasActivePremiumAsync_ReturnsFalse_WhenConnectionStringEmpty()
    {
        var opt = Options.Create(new SupabaseOptions { ConnectionString = "" });
        var svc = new UserEntitlementService(opt);
        var result = await svc.HasActivePremiumAsync(Guid.NewGuid());
        Assert.False(result);
    }
}
