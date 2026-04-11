using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support")]
[AdminApiKey]
public class SupportVaccinationsController : ControllerBase
{
    private readonly ISupportVaccinationAdminService _vaccinations;

    public SupportVaccinationsController(ISupportVaccinationAdminService vaccinations)
    {
        _vaccinations = vaccinations;
    }

    [HttpGet("pets/{petId:guid}/vaccinations")]
    public async Task<ActionResult<IReadOnlyList<SupportVaccinationRow>>> List(Guid petId, CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _vaccinations.ListForPetAsync(petId, cancellationToken));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "Pet not found" });
        }
    }

    [HttpPost("pets/{petId:guid}/vaccinations")]
    public async Task<ActionResult<SupportVaccinationRow>> Create(
        Guid petId,
        [FromBody] CreateSupportVaccinationRequest body,
        CancellationToken cancellationToken)
    {
        try
        {
            var row = await _vaccinations.CreateAsync(petId, body, cancellationToken);
            return Created($"/api/support/pets/{petId}/vaccinations/{row.Id}", row);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "Pet not found" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex) when (ex.Message.StartsWith("DUPLICATE", StringComparison.Ordinal))
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpPut("vaccinations/{vaccinationId:guid}")]
    public async Task<ActionResult<SupportVaccinationRow>> Update(
        Guid vaccinationId,
        [FromBody] UpdateSupportVaccinationRequest body,
        CancellationToken cancellationToken)
    {
        try
        {
            var row = await _vaccinations.UpdateAsync(vaccinationId, body, cancellationToken);
            if (row is null)
                return NotFound(new { error = "Vaccination not found" });
            return Ok(row);
        }
        catch (InvalidOperationException ex) when (ex.Message.StartsWith("DUPLICATE", StringComparison.Ordinal))
        {
            return Conflict(new { error = ex.Message });
        }
    }
}
