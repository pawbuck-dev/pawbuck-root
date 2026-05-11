using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;
using PawBuck.API;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

/// <summary>
/// RAG-based FAQ API for the Paw Buck ecosystem (Milo).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class MiloController : ControllerBase
{
    private readonly MiloRagService _ragService;
    private readonly IMiloReasoningService _reasoning;
    private readonly IMiloCuratedSnippetsService _curatedSnippets;
    private readonly IOptions<MiloOptions> _miloOptions;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<MiloController> _logger;
    private readonly IUserEntitlementService _entitlements;
    private readonly ISubscriptionFeatureGateService _featureGates;
    private readonly IOptions<SubscriptionOptions> _subscriptionOptions;
    private readonly IMiloJournalTurnService _journalTurns;

    public MiloController(
        MiloRagService ragService,
        IMiloReasoningService reasoning,
        IMiloCuratedSnippetsService curatedSnippets,
        IOptions<MiloOptions> miloOptions,
        IWebHostEnvironment environment,
        ILogger<MiloController> logger,
        IUserEntitlementService entitlements,
        ISubscriptionFeatureGateService featureGates,
        IOptions<SubscriptionOptions> subscriptionOptions,
        IMiloJournalTurnService journalTurns)
    {
        _ragService = ragService;
        _reasoning = reasoning;
        _curatedSnippets = curatedSnippets;
        _miloOptions = miloOptions;
        _environment = environment;
        _logger = logger;
        _entitlements = entitlements;
        _featureGates = featureGates;
        _subscriptionOptions = subscriptionOptions;
        _journalTurns = journalTurns;
    }

    /// <summary>
    /// In-app Milo chat: plan → fetch authorized pet facts → optional FAQ RAG → answer. Requires Supabase user JWT.
    /// </summary>
    [Authorize]
    [HttpPost("chat")]
    [ProducesResponseType(typeof(MiloChatResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status402PaymentRequired)]
    public async Task<IActionResult> Chat([FromBody] MiloChatRequest? request, CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { error = "message is required" });

        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        var gateRequiresPremium = await _featureGates.IsPremiumRequiredForFeatureAsync(SubscriptionFeatureKeys.MiloChat, cancellationToken);
        var requirePremiumMilo = _subscriptionOptions.Value.RequirePremiumForMilo || gateRequiresPremium;
        if (requirePremiumMilo)
        {
            var premium = await _entitlements.HasActivePremiumAsync(userId, cancellationToken);
            if (!premium)
            {
                return StatusCode(StatusCodes.Status402PaymentRequired, new
                {
                    error = "subscription_required",
                    message = "PawBuck Premium is required to chat with Milo.",
                });
            }
        }

        try
        {
            var response = await _reasoning.ChatAsync(userId, request, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Milo chat failed");
            return StatusCode(500, new MiloChatResponse
            {
                Answer = "Woof! Something went wrong. Please try again! 🐕",
                PetName = request.Pet?.Name,
            });
        }
    }

    /// <summary>
    /// Plain-text vet notification draft (subject + body) from structured fields. Same rules as the consumer compose helper.
    /// </summary>
    [Authorize]
    [HttpPost("vet-notification-draft")]
    [ProducesResponseType(typeof(MiloVetNotificationDraftResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult VetNotificationDraft([FromBody] MiloVetNotificationDraftRequest? body)
    {
        if (body == null)
            return BadRequest(new { error = "body is required" });
        var (subject, text) = VetNotificationPlainTextComposer.Compose(body);
        return Ok(new MiloVetNotificationDraftResponse { Subject = subject, Body = text });
    }

    /// <summary>
    /// Thumbs up/down on a journal Milo assistant turn (<see cref="MiloChatResponse.ResponseId"/>).
    /// </summary>
    [Authorize]
    [HttpPost("chat/feedback")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PostJournalFeedback(
        [FromBody] MiloJournalFeedbackRequest? body,
        CancellationToken cancellationToken)
    {
        if (body == null)
            return BadRequest(new { error = "body is required" });
        var resolvedTurn = ResolveFeedbackTurnId(body);
        if (!resolvedTurn.HasValue)
            return BadRequest(new { error = "responseId or turnId is required" });
        var r = (body.Rating ?? "").Trim().ToLowerInvariant();
        if (r is not ("up" or "down"))
            return BadRequest(new { error = "rating must be 'up' or 'down'" });

        var sub = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        var ok = await _journalTurns.TrySubmitFeedbackAsync(userId, resolvedTurn.Value, r, cancellationToken);
        if (!ok)
            return NotFound(new { error = "Turn not found, expired, or not yours." });

        return Ok(new { ok = true });
    }

    private static Guid? ResolveFeedbackTurnId(MiloJournalFeedbackRequest body)
    {
        if (body.ResponseId != Guid.Empty)
            return body.ResponseId;
        var raw = (body.TurnId ?? "").Trim();
        if (string.IsNullOrEmpty(raw))
            return null;
        return Guid.TryParse(raw, out var g) && g != Guid.Empty ? g : null;
    }

    /// <summary>
    /// Ask Milo a question. Uses RAG context from the documentation table; falls back to General Help when no context is found.
    /// </summary>
    [HttpPost("ask")]
    [ProducesResponseType(typeof(MiloQueryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Ask([FromBody] MiloAskRequest request, CancellationToken cancellationToken)
    {
        if (request?.Question == null)
        {
            return BadRequest(new { error = "question is required" });
        }

        var question = request.Question.Trim();
        if (string.IsNullOrEmpty(question))
        {
            return BadRequest(new { error = "question cannot be empty" });
        }

        try
        {
            var response = await _ragService.AskAsync(question, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Milo Ask failed");
            return StatusCode(500, new MiloQueryResponse
            {
                Answer = MiloRagService.GENERAL_HELP_RESPONSE,
                UsedContext = false,
                IsGeneralHelp = true
            });
        }
    }

    /// <summary>
    /// Curated breed/species snippets for Milo chat grounding. Prefer Edge calling this when
    /// <c>MILO_INTERNAL_SERVICE_KEY</c> is configured; otherwise Edge reads Postgres directly.
    /// </summary>
    [HttpGet("curated-guidance")]
    [ProducesResponseType(typeof(IReadOnlyList<MiloCuratedSnippetDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> CuratedGuidance(
        [FromHeader(Name = "X-Pawbuck-Milo-Internal-Key")] string? internalKey,
        [FromQuery] string? breed,
        [FromQuery] string? animalType,
        [FromQuery] string? topic,
        CancellationToken cancellationToken)
    {
        var expected = _miloOptions.Value.InternalServiceKey?.Trim();
        if (string.IsNullOrEmpty(expected))
        {
            if (!_environment.IsDevelopment())
            {
                _logger.LogWarning("Milo InternalServiceKey not configured; curated-guidance disabled outside Development");
                return StatusCode(503, new { error = "curated-guidance not configured" });
            }
        }
        else if (!string.Equals(internalKey, expected, StringComparison.Ordinal))
        {
            return Unauthorized();
        }

        try
        {
            var rows = await _curatedSnippets.GetGuidanceAsync(breed, animalType, topic, cancellationToken);
            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Curated guidance query failed");
            return StatusCode(500, new { error = "curated-guidance failed" });
        }
    }
}
