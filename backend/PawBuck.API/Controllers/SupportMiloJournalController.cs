using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/milo/journal")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public class SupportMiloJournalController : ControllerBase
{
    private readonly IMiloJournalConfigAdminService _configAdmin;
    private readonly IMiloJournalFeedbackAggregateService _aggregates;
    private readonly IMiloReasoningService _reasoning;
    private readonly ISupportDirectoryService _directory;
    private readonly ILogger<SupportMiloJournalController> _logger;

    public SupportMiloJournalController(
        IMiloJournalConfigAdminService configAdmin,
        IMiloJournalFeedbackAggregateService aggregates,
        IMiloReasoningService reasoning,
        ISupportDirectoryService directory,
        ILogger<SupportMiloJournalController> logger)
    {
        _configAdmin = configAdmin;
        _aggregates = aggregates;
        _reasoning = reasoning;
        _directory = directory;
        _logger = logger;
    }

    [HttpGet("config")]
    [ProducesResponseType(typeof(MiloJournalConfigSnapshot), StatusCodes.Status200OK)]
    public async Task<ActionResult<MiloJournalConfigSnapshot>> GetConfig(CancellationToken cancellationToken)
    {
        var c = await _configAdmin.GetAsync(cancellationToken);
        return Ok(c);
    }

    [HttpPatch("config")]
    [ProducesResponseType(typeof(MiloJournalConfigSnapshot), StatusCodes.Status200OK)]
    public async Task<ActionResult<MiloJournalConfigSnapshot>> PatchConfig(
        [FromBody] MiloJournalConfigPatchRequest? body,
        CancellationToken cancellationToken)
    {
        if (body?.Config == null)
            return BadRequest(new { error = "config is required" });

        await _configAdmin.SaveAsync(body.Config, cancellationToken);
        var c = await _configAdmin.GetAsync(cancellationToken);
        _logger.LogInformation("Milo journal config updated via admin");
        return Ok(c);
    }

    [HttpGet("feedback-aggregates")]
    [ProducesResponseType(typeof(MiloJournalFeedbackAggregatesDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<MiloJournalFeedbackAggregatesDto>> GetFeedbackAggregates(
        CancellationToken cancellationToken)
    {
        var dto = await _aggregates.GetAggregatesAsync(cancellationToken);
        return Ok(dto);
    }

    /// <summary>
    /// Runs <see cref="IMiloReasoningService.ChatAsync"/> for a verified user/pet pair (same request shape as the consumer app).
    /// Skips subscription gating; AdminSupport only.
    /// </summary>
    [HttpPost("chat-smoke")]
    [ProducesResponseType(typeof(MiloChatResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MiloChatResponse>> ChatSmoke(
        [FromBody] MiloJournalChatSmokeRequest? body,
        CancellationToken cancellationToken)
    {
        if (body == null || string.IsNullOrWhiteSpace(body.Message))
            return BadRequest(new { error = "message is required" });

        if (body.UserId == Guid.Empty)
            return BadRequest(new { error = "userId is required" });

        if (body.PetId == Guid.Empty)
            return BadRequest(new { error = "petId is required" });

        var pet = await _directory.GetPetByIdAsync(body.PetId, cancellationToken);
        if (pet == null)
            return NotFound(new { error = "Pet not found" });

        if (pet.UserId != body.UserId)
            return BadRequest(new { error = "Pet does not belong to the specified user" });

        var petDto = MapSupportPetToMiloContext(pet);
        var request = new MiloChatRequest
        {
            Message = body.Message.Trim(),
            Pet = petDto,
            History = Array.Empty<MiloChatHistoryMessage>(),
            JournalMode = body.JournalMode,
        };

        _logger.LogInformation(
            "Milo journal chat-smoke: user {UserId} pet {PetId} journalMode={JournalMode}",
            body.UserId,
            body.PetId,
            body.JournalMode);

        var response = await _reasoning.ChatAsync(body.UserId, request, cancellationToken);
        return Ok(response);
    }

    private static MiloPetContextDto MapSupportPetToMiloContext(SupportPetRow pet)
    {
        var dob = pet.DateOfBirth?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return new MiloPetContextDto
        {
            Id = pet.Id.ToString(),
            Name = pet.Name,
            AnimalType = pet.AnimalType,
            Breed = pet.Breed,
            DateOfBirth = dob,
            Sex = pet.Sex,
            WeightValue = 0,
            WeightUnit = "kg",
        };
    }
}
