using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/subscription/feature-gates")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportSubscriptionFeatureGatesController : ControllerBase
{
    private readonly ISubscriptionFeatureGateService _featureGates;

    public SupportSubscriptionFeatureGatesController(ISubscriptionFeatureGateService featureGates)
    {
        _featureGates = featureGates;
    }

    [HttpGet]
    [ProducesResponseType(typeof(SubscriptionFeatureGatesResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SubscriptionFeatureGatesResponse>> List(CancellationToken cancellationToken)
    {
        var items = await _featureGates.GetAllAsync(cancellationToken);
        return Ok(new SubscriptionFeatureGatesResponse { Items = items });
    }

    [HttpPatch("{featureKey}")]
    [ProducesResponseType(typeof(SubscriptionFeatureGateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SubscriptionFeatureGateDto>> Patch(
        string featureKey,
        [FromBody] PatchSubscriptionFeatureGateRequest body,
        CancellationToken cancellationToken)
    {
        var ok = await _featureGates.TryUpdateRequiresPremiumAsync(featureKey, body.RequiresPremium, cancellationToken);
        if (!ok)
            return NotFound(new { error = "Unknown feature_key" });

        var all = await _featureGates.GetAllAsync(cancellationToken);
        var row = all.FirstOrDefault(x =>
            string.Equals(x.FeatureKey, featureKey, StringComparison.Ordinal));
        if (row is null)
            return NotFound(new { error = "Unknown feature_key" });

        return Ok(row);
    }
}
