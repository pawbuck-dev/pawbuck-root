using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/pets")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportPetsController : ControllerBase
{
    private readonly ISupportDirectoryService _directory;

    public SupportPetsController(ISupportDirectoryService directory)
    {
        _directory = directory;
    }

    /// <summary>Search pets by name (min 2 characters).</summary>
    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<SupportPetExplorerRow>>> Search(
        [FromQuery] string q,
        CancellationToken cancellationToken)
    {
        var rows = await _directory.SearchPetsAsync(q ?? "", cancellationToken);
        return Ok(rows);
    }
}
