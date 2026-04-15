using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/users")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportUsersController : ControllerBase
{
    private readonly ISupportDirectoryService _directory;

    public SupportUsersController(ISupportDirectoryService directory)
    {
        _directory = directory;
    }

    [HttpGet("search")]
    public async Task<ActionResult<IReadOnlyList<SupportUserRow>>> Search([FromQuery] string q, CancellationToken cancellationToken)
    {
        var rows = await _directory.SearchUsersByEmailAsync(q ?? "", cancellationToken);
        return Ok(rows);
    }

    /// <summary>Lists users by segment (same definitions as dashboard metrics). Max 500 rows.</summary>
    [HttpGet("list")]
    public async Task<ActionResult<IReadOnlyList<SupportUserRow>>> List(
        [FromQuery] string segment,
        CancellationToken cancellationToken)
    {
        try
        {
            var rows = await _directory.ListUsersAsync(segment ?? "", cancellationToken);
            return Ok(rows);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Paginated user directory with server-side search (email or display name).</summary>
    [HttpGet("directory")]
    public async Task<ActionResult<SupportUserDirectoryResponse>> Directory(
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken cancellationToken = default)
    {
        var result = await _directory.GetUserDirectoryAsync(q, page, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{userId:guid}/timeline")]
    public async Task<ActionResult<IReadOnlyList<SupportHealthTimelineEvent>>> Timeline(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var rows = await _directory.GetUserHealthTimelineAsync(userId, cancellationToken);
        return Ok(rows);
    }

    [HttpGet("{userId:guid}/pets")]
    public async Task<ActionResult<IReadOnlyList<SupportPetRow>>> Pets(Guid userId, CancellationToken cancellationToken)
    {
        var rows = await _directory.GetPetsForUserAsync(userId, cancellationToken);
        return Ok(rows);
    }
}
