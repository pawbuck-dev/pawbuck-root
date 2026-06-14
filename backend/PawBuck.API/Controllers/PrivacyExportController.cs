using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Authorize]
[Route("api/privacy/export")]
public class PrivacyExportController : ControllerBase
{
    private readonly IPrivacyExportService _export;

    public PrivacyExportController(IPrivacyExportService export)
    {
        _export = export;
    }

    [HttpPost]
    public async Task<IActionResult> RequestExport(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var existing = await _export.GetLatestStatusAsync(userId, cancellationToken);
        if (existing is { Status: "queued" or "running" })
            return Conflict(new { error = "export_already_in_progress", requestId = existing.Id });

        var id = await _export.QueueExportAsync(userId, cancellationToken);
        return Accepted(new { requestId = id, status = "queued" });
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized();

        var row = await _export.GetLatestStatusAsync(userId, cancellationToken);
        if (row is null)
            return Ok(new { status = "none" });

        return Ok(new
        {
            requestId = row.Id,
            status = row.Status,
            expiresAt = row.ExpiresAt,
            createdAt = row.CreatedAt,
            hasFile = !string.IsNullOrEmpty(row.FilePath),
        });
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = default;
        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return !string.IsNullOrEmpty(sub) && Guid.TryParse(sub, out userId);
    }
}
