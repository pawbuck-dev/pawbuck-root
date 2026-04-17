using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

/// <summary>
/// Authenticated subscription / paywall configuration for the mobile app.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubscriptionController : ControllerBase
{
    private readonly ISubscriptionFeatureGateService _featureGates;

    public SubscriptionController(ISubscriptionFeatureGateService featureGates)
    {
        _featureGates = featureGates;
    }

    /// <summary>
    /// Feature gates: which product areas require PawBuck Premium (admin-controlled).
    /// </summary>
    [HttpGet("feature-gates")]
    [ProducesResponseType(typeof(SubscriptionFeatureGatesResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SubscriptionFeatureGatesResponse>> GetFeatureGates(CancellationToken cancellationToken)
    {
        var items = await _featureGates.GetAllAsync(cancellationToken);
        return Ok(new SubscriptionFeatureGatesResponse { Items = items });
    }
}
