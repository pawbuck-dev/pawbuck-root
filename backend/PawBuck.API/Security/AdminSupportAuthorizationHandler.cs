using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;

namespace PawBuck.API.Security;

public sealed class AdminSupportAuthorizationHandler : AuthorizationHandler<AdminSupportRequirement>
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AdminSupportAuthorizationHandler> _logger;
    private readonly IOptions<AdminOptions> _options;

    public AdminSupportAuthorizationHandler(
        IWebHostEnvironment env,
        ILogger<AdminSupportAuthorizationHandler> logger,
        IOptions<AdminOptions> options)
    {
        _env = env;
        _logger = logger;
        _options = options;
    }

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AdminSupportRequirement requirement)
    {
        var path = (context.Resource as HttpContext)?.Request.Path.Value ?? "(unknown)";
        var opts = _options.Value;

        if (_env.IsDevelopment() && opts.AllowAnonymousSupportInDevelopment)
        {
            _logger.LogInformation("AdminSupportPolicy allowed (Development anonymous): {Path}", path);
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        if (context.User.HasClaim(SupabaseAdminClaimHelper.PawbuckAdminClaimType, SupabaseAdminClaimHelper.PawbuckAdminClaimValue))
        {
            _logger.LogInformation("AdminSupportPolicy allowed (pawbuck_admin claim): {Path}", path);
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        var authenticated = context.User.Identity?.IsAuthenticated == true;
        _logger.LogWarning(
            "AdminSupportPolicy denied: {Path}, authenticated={Authenticated}",
            path,
            authenticated);
        return Task.CompletedTask;
    }
}
