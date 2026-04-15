using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;

namespace PawBuck.API.Security;

public sealed class AdminSupportAuthorizationHandler : AuthorizationHandler<AdminSupportRequirement>
{
    private readonly IWebHostEnvironment _env;
    private readonly IOptions<AdminOptions> _options;

    public AdminSupportAuthorizationHandler(IWebHostEnvironment env, IOptions<AdminOptions> options)
    {
        _env = env;
        _options = options;
    }

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AdminSupportRequirement requirement)
    {
        var opts = _options.Value;

        if (_env.IsDevelopment() && opts.AllowAnonymousSupportInDevelopment)
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        if (context.User.HasClaim(SupabaseAdminClaimHelper.PawbuckAdminClaimType, SupabaseAdminClaimHelper.PawbuckAdminClaimValue))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        return Task.CompletedTask;
    }
}
