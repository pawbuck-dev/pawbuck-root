using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;

namespace PawBuck.API.Security;

/// <summary>
/// Requires <c>X-Admin-Api-Key</c> when <see cref="AdminOptions.ApiKey"/> is set.
/// In Development, allows requests if the key is not configured (local UX).
/// </summary>
public class AdminApiKeyAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var opts = context.HttpContext.RequestServices.GetRequiredService<IOptions<AdminOptions>>();
        var env = context.HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>();
        var expected = opts.Value.ApiKey?.Trim();

        if (string.IsNullOrEmpty(expected))
        {
            if (!env.IsDevelopment())
            {
                context.Result = new ObjectResult(new { error = "Admin API key is not configured" })
                {
                    StatusCode = StatusCodes.Status503ServiceUnavailable,
                };
                return;
            }
        }
        else
        {
            if (!context.HttpContext.Request.Headers.TryGetValue("X-Admin-Api-Key", out var provided) ||
                !string.Equals(provided.ToString(), expected, StringComparison.Ordinal))
            {
                context.Result = new UnauthorizedObjectResult(new { error = "Invalid or missing X-Admin-Api-Key" });
                return;
            }
        }

        await next();
    }
}
