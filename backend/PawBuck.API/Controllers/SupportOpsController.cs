using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/ops-health")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportOpsController : ControllerBase
{
    private readonly MiloOptions _miloOptions;
    private readonly SupabaseOptions _supabaseOptions;
    private readonly GeminiOptions _geminiOptions;

    public SupportOpsController(
        IOptions<MiloOptions> miloOptions,
        IOptions<SupabaseOptions> supabaseOptions,
        IOptions<GeminiOptions> geminiOptions)
    {
        _miloOptions = miloOptions.Value;
        _supabaseOptions = supabaseOptions.Value;
        _geminiOptions = geminiOptions.Value;
    }

    /// <summary>Email/OCR pipeline readiness checklist for admin (no secrets).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(SupportOpsHealthResponse), StatusCodes.Status200OK)]
    public IActionResult GetOpsHealth()
    {
        var result = ApiHealthStatusBuilder.BuildAdminOpsHealth(
            _miloOptions,
            _supabaseOptions,
            _geminiOptions);
        return Ok(result);
    }
}
