using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly MiloOptions _miloOptions;

    public HealthController(IOptions<MiloOptions> miloOptions)
    {
        _miloOptions = miloOptions.Value;
    }

    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "healthy",
            miloAnalyzeInternalConfigured = !string.IsNullOrEmpty(_miloOptions.InternalServiceKey?.Trim()),
        });
    }
}
