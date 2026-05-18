using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/email-document-verification")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public sealed class SupportCountryEmailDocumentVerificationController : ControllerBase
{
    private readonly ICountryEmailDocumentVerificationService _rules;

    public SupportCountryEmailDocumentVerificationController(
        ICountryEmailDocumentVerificationService rules)
    {
        _rules = rules;
    }

    [HttpGet]
    [ProducesResponseType(typeof(CountryEmailDocumentVerificationListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CountryEmailDocumentVerificationListResponse>> List(
        CancellationToken cancellationToken)
    {
        var items = await _rules.GetAllAsync(cancellationToken);
        return Ok(new CountryEmailDocumentVerificationListResponse { Items = items });
    }

    [HttpPatch("{country}")]
    [ProducesResponseType(typeof(CountryEmailDocumentVerificationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CountryEmailDocumentVerificationDto>> Patch(
        string country,
        [FromBody] PatchCountryEmailDocumentVerificationRequest body,
        CancellationToken cancellationToken)
    {
        try
        {
            var row = await _rules.TryUpdateAsync(country, body, cancellationToken);
            if (row is null)
                return NotFound(new { error = "Unknown country" });
            return Ok(row);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
