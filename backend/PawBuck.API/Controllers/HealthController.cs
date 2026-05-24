using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly MiloOptions _miloOptions;
    private readonly SupabaseOptions _supabaseOptions;
    private readonly GeminiOptions _geminiOptions;

    public HealthController(
        IOptions<MiloOptions> miloOptions,
        IOptions<SupabaseOptions> supabaseOptions,
        IOptions<GeminiOptions> geminiOptions)
    {
        _miloOptions = miloOptions.Value;
        _supabaseOptions = supabaseOptions.Value;
        _geminiOptions = geminiOptions.Value;
    }

    [HttpGet]
    public IActionResult Get()
    {
        return Ok(ApiHealthStatusBuilder.Build(_miloOptions, _supabaseOptions, _geminiOptions));
    }
}
