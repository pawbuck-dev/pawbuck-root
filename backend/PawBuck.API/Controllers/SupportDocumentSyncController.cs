using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/document-sync")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public sealed class SupportDocumentSyncController : ControllerBase
{
    private readonly IPetDocumentClinicalSyncService _clinicalSync;

    public SupportDocumentSyncController(IPetDocumentClinicalSyncService clinicalSync)
    {
        _clinicalSync = clinicalSync;
    }

    /// <summary>
    /// Processes up to <paramref name="batchSize"/> <c>pet_documents</c> rows where <c>clinical_synced_at</c> is null
    /// (vaccinations, medications, clinical_exams, lab_results). Same logic as <see cref="PawBuck.API.Services.DocumentSyncWorker"/>.
    /// </summary>
    [HttpPost("run")]
    [ProducesResponseType(typeof(SupportDocumentSyncRunResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Run([FromQuery] int batchSize = 20, CancellationToken cancellationToken = default)
    {
        batchSize = Math.Clamp(batchSize, 1, 100);
        var n = await _clinicalSync.ProcessPendingDocumentsAsync(batchSize, cancellationToken);
        var message = n == 0
            ? "No pending vault rows matched (or none in this batch). Pending = clinical_synced_at IS NULL and document_type in vaccinations, medications, clinical_exams, lab_results."
            : $"Attempted sync for {n} pet_documents row(s). Check API logs for per-row errors.";
        return Ok(new SupportDocumentSyncRunResponse { RowsAttempted = n, Message = message });
    }

    /// <summary>
    /// Removes clinical rows tied to the vault file, clears sync state, and re-runs ingestion for one document.
    /// </summary>
    [HttpPost("resync/{documentId:guid}")]
    [ProducesResponseType(typeof(PetDocumentClinicalSyncResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Resync(Guid documentId, CancellationToken cancellationToken = default)
    {
        var result = await _clinicalSync.ResyncDocumentByIdAsync(documentId, cancellationToken);
        if (string.Equals(result.Error, "document_not_found", StringComparison.Ordinal))
            return NotFound(result);
        return Ok(result);
    }
}
