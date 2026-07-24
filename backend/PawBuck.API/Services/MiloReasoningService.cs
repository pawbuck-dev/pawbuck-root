using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Plan (structured JSON) → fetch pet facts (Npgsql) → optional RAG → final answer (Gemini).
/// </summary>
public class MiloReasoningService : IMiloReasoningService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IMiloPetFactsService _petFacts;
    private readonly IPetConversationalContextService _petConversationalContext;
    private readonly IMiloJournalConfigProvider _journalConfig;
    private readonly IMiloJournalTurnService _journalTurns;
    private readonly IJournalTreeInterviewService _journalTreeInterview;
    private readonly IKnowledgeBaseService _knowledgeBase;
    private readonly IMiloCuratedSnippetsService _curatedSnippets;
    private readonly IGeminiGenerateContentService _geminiGenerate;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<GeminiOptions> _geminiOptions;
    private readonly IOptions<MiloOptions> _miloOptions;
    private readonly ILogger<MiloReasoningService> _logger;

    public MiloReasoningService(
        IMiloPetFactsService petFacts,
        IPetConversationalContextService petConversationalContext,
        IMiloJournalConfigProvider journalConfig,
        IMiloJournalTurnService journalTurns,
        IJournalTreeInterviewService journalTreeInterview,
        IKnowledgeBaseService knowledgeBase,
        IMiloCuratedSnippetsService curatedSnippets,
        IGeminiGenerateContentService geminiGenerate,
        IHttpClientFactory httpClientFactory,
        IOptions<GeminiOptions> geminiOptions,
        IOptions<MiloOptions> miloOptions,
        ILogger<MiloReasoningService> logger)
    {
        _petFacts = petFacts;
        _petConversationalContext = petConversationalContext;
        _journalConfig = journalConfig;
        _journalTurns = journalTurns;
        _journalTreeInterview = journalTreeInterview;
        _knowledgeBase = knowledgeBase;
        _curatedSnippets = curatedSnippets;
        _geminiGenerate = geminiGenerate;
        _httpClientFactory = httpClientFactory;
        _geminiOptions = geminiOptions;
        _miloOptions = miloOptions;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<MiloChatResponse> ChatAsync(Guid userId, MiloChatRequest request, CancellationToken cancellationToken = default)
    {
        var message = (request.Message ?? "").Trim();
        if (string.IsNullOrEmpty(message))
        {
            return new MiloChatResponse
            {
                Answer = "Please enter a message so I can help. 🐕",
                PetName = request.Pet?.Name,
            };
        }

        Guid? petId = null;
        if (!string.IsNullOrWhiteSpace(request.Pet?.Id) && Guid.TryParse(request.Pet.Id, out var pid))
            petId = pid;

        var petHasAccess = petId.HasValue && await _petFacts.VerifyPetAccessAsync(userId, petId.Value, cancellationToken);
        string? petRole = null;
        if (petHasAccess && petId.HasValue)
            petRole = await _petFacts.GetUserPetRoleAsync(userId, petId.Value, cancellationToken);

        if (petId.HasValue && !petHasAccess)
        {
            return new MiloChatResponse
            {
                Answer = "I can't access health data for this pet. Please select a pet you have access to, or sign in again.",
                PetName = request.Pet?.Name,
            };
        }

        if (request.JournalMode && (!petId.HasValue || !petHasAccess))
        {
            return new MiloChatResponse
            {
                Answer = "Please select a pet you can access to use journal chat.",
                PetName = request.Pet?.Name,
            };
        }

        var apiKey = _geminiOptions.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("Gemini API key not configured for Milo chat");
            return new MiloChatResponse
            {
                Answer = "I'm not quite configured yet. Please try again later! 🐕",
                PetName = request.Pet?.Name,
            };
        }

        var petContextBlock = BuildPetContextPrompt(request.Pet, petHasAccess, petRole);

        if (request.JournalMode && petId.HasValue && petHasAccess)
        {
            var petDisplayName = request.Pet?.Name?.Trim() ?? "your pet";
            var journalConfig = await _journalConfig.GetAsync(cancellationToken);
            PetConversationalContextDto? conversationalContext = null;

            async Task<PetConversationalContextDto?> LoadConversationalContextAsync()
            {
                conversationalContext ??= await _petConversationalContext.GetPetConversationalContextAsync(
                    userId,
                    petId.Value,
                    journalConfig,
                    cancellationToken);
                return conversationalContext;
            }

            if (string.Equals(request.JournalAction, "start_checkin", StringComparison.OrdinalIgnoreCase))
            {
                await LoadConversationalContextAsync();
                return JournalWellnessCheckInHelper.BuildTopicPickerResponse(
                    petDisplayName,
                    journalConfig.PromptVersion,
                    conversationalContext,
                    DateTime.UtcNow);
            }

            await LoadConversationalContextAsync();
            var wellnessResponse = JournalWellnessCheckInHelper.TryBuildAllGoodTodayResponse(
                message,
                conversationalContext!,
                petDisplayName,
                DateTime.UtcNow);
            if (wellnessResponse != null)
                return wellnessResponse;

            var routineResponse = JournalRoutineLogHelper.TryBuildOneShotResponse(message, petDisplayName);
            if (routineResponse != null)
                return routineResponse;

            MiloChatResponse? treeResponse = null;
            try
            {
                treeResponse = await _journalTreeInterview.TryRunTurnAsync(
                    request,
                    userId,
                    petId.Value,
                    journalConfig,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Journal tree interview failed for user {UserId} pet {PetId}", userId, petId);
            }

            if (treeResponse != null)
                return treeResponse;

            if (journalConfig.JournalTreeInterviewEnabled
                && !Guid.TryParse(request.JournalSessionId, out _)
                && !IsExplicitJournalTopicSelection(request))
            {
                return JournalWellnessCheckInHelper.BuildTopicPickerResponse(
                    petDisplayName,
                    journalConfig.PromptVersion,
                    conversationalContext,
                    DateTime.UtcNow);
            }

            var journalResponse = await RunJournalInterviewAsync(
                apiKey,
                request,
                petContextBlock,
                userId,
                petId.Value,
                petRole,
                cancellationToken);
            if (journalResponse != null)
                return journalResponse;

            return new MiloChatResponse
            {
                Answer = "Sorry, I'm having trouble. Please try again! 🐕",
                PetName = request.Pet?.Name,
            };
        }

        var plan = await RunPlanStepAsync(apiKey, message, request.History, petContextBlock, petHasAccess, cancellationToken);
        if (plan == null)
        {
            return new MiloChatResponse
            {
                Answer = "Sorry, I'm having trouble planning a response. Please try again! 🐕",
                PetName = request.Pet?.Name,
            };
        }

        ApplyNoPetGuard(plan, petHasAccess);

        var needsDocumentationRag =
            plan.NeedsDocumentationRag || MiloDocumentationRagHeuristic.ShouldForceDocumentationRag(message);
        if (needsDocumentationRag && !plan.NeedsDocumentationRag)
            _logger.LogDebug("Using documentation RAG: planner omitted flag; message matched FAQ/product heuristic.");

        var kinds = MiloPlanNormalizer.NormalizeDataNeeded(plan.DataNeeded, _logger);
        var factsText = "";
        var usedPetData = false;
        if (petHasAccess && petId.HasValue && kinds.Count > 0)
        {
            usedPetData = true;
            factsText = await FetchFactsByKindsAsync(userId, petId.Value, kinds, cancellationToken);
        }

        var usedRag = false;
        string? ragBlock = null;
        IReadOnlyList<DocumentationChunk> ragChunks = Array.Empty<DocumentationChunk>();
        if (needsDocumentationRag)
        {
            var boostFiles = MiloDocumentationRagHeuristic.GetBoostSourceFiles(message);
            ragChunks = await _knowledgeBase.GetContextAsync(
                message,
                5,
                cancellationToken,
                boostFiles.Count > 0 ? boostFiles : null);
            if (ragChunks.Count > 0)
            {
                usedRag = true;
                var sb = new StringBuilder();
                for (var i = 0; i < ragChunks.Count; i++)
                    sb.AppendLine($"[Doc {i + 1}] {ragChunks[i].Content}");
                ragBlock = sb.ToString();
            }
            else
            {
                _logger.LogInformation(
                    "Milo documentation RAG requested but match_documentation returned no rows (empty documentation table or embedding mismatch).");
            }
        }

        var usedCurated = false;
        string? curatedBlock = null;
        var curatedTopic = MiloCuratedTopicHeuristic.InferTopic(message);
        IReadOnlyList<MiloCuratedSnippetDto> curatedSnippets = Array.Empty<MiloCuratedSnippetDto>();
        if (curatedTopic != null)
        {
            var breedKey = MiloCuratedSnippetsService.NormalizeBreedKey(request.Pet?.Breed);
            curatedSnippets = await _curatedSnippets.GetGuidanceAsync(
                breedKey,
                request.Pet?.AnimalType,
                curatedTopic,
                cancellationToken);
            if (curatedSnippets.Count > 0)
            {
                usedCurated = true;
                curatedBlock = BuildCuratedBlock(curatedSnippets);
            }
        }

        var sources = new List<MiloChatSourceDto>();
        if (usedPetData)
            sources.Add(MiloChatSourceBuilder.PetRecordSummary(request.Pet?.Name));
        foreach (var chunk in ragChunks)
            sources.Add(MiloChatSourceBuilder.FromDocumentationChunk(chunk));
        foreach (var snippet in curatedSnippets)
            sources.Add(MiloChatSourceBuilder.FromCuratedSnippet(snippet));

        var productHelpFocus = usedRag && !usedPetData;
        var answer = await RunAnswerStepAsync(
            apiKey,
            message,
            request.History,
            petContextBlock,
            factsText,
            ragBlock,
            curatedBlock,
            productHelpFocus,
            cancellationToken);

        IReadOnlyList<MiloChatFileAttachment>? fileAttachments = null;
        if (usedPetData && petId.HasValue)
        {
            var docs = await _petFacts.GetDocumentAttachmentsForPlanKindsAsync(
                userId,
                petId.Value,
                kinds,
                maxCount: 5,
                cancellationToken);
            if (docs.Count > 0)
                fileAttachments = docs;
        }

        var exposePlan = _miloOptions.Value.ExposePlanSummary;
        var planSummary = exposePlan
            ? $"{plan.ReasoningBrief ?? ""} | dataNeeded: [{string.Join(", ", plan.DataNeeded ?? new List<string>())}] | ragPlan: {plan.NeedsDocumentationRag} | ragEffective: {needsDocumentationRag}"
            : null;

        Guid? feedbackTurnId = null;
        try
        {
            var registered = await _journalTurns.RegisterTurnAsync(
                userId,
                petId,
                "general",
                kinds,
                "general",
                cancellationToken);
            feedbackTurnId = registered == Guid.Empty ? null : registered;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to register general Milo chat turn; continuing without turnId");
        }

        return new MiloChatResponse
        {
            Answer = string.IsNullOrWhiteSpace(answer)
                ? "I couldn't come up with a response. Could you try rephrasing? 🐕"
                : answer.Trim(),
            UsedPetData = usedPetData,
            UsedRag = usedRag,
            UsedCurated = usedCurated,
            Sources = sources.Count > 0 ? sources : null,
            PlanSummary = planSummary,
            PetName = request.Pet?.Name,
            FileAttachments = fileAttachments,
            ResponseId = feedbackTurnId,
            TurnId = feedbackTurnId.HasValue ? feedbackTurnId.Value.ToString("D") : null,
        };
    }

    private async Task<string> FetchFactsByKindsAsync(
        Guid userId,
        Guid petId,
        IReadOnlyList<string> kinds,
        CancellationToken cancellationToken)
    {
        var sb = new StringBuilder();
        // Order follows `kinds` (e.g. normalizer may return health_summary then journal). Do not return early on health_summary.
        foreach (var k in kinds)
        {
            switch (k)
            {
                case MiloPetFactsKinds.HealthSummary:
                    sb.AppendLine(await _petFacts.GetHealthSummaryTextAsync(userId, petId, cancellationToken));
                    sb.AppendLine();
                    break;
                case MiloPetFactsKinds.Journal:
                    sb.AppendLine(await _petFacts.GetJournalEntriesTextAsync(userId, petId, cancellationToken));
                    sb.AppendLine();
                    break;
                case MiloPetFactsKinds.Vaccinations:
                    sb.AppendLine(await _petFacts.GetVaccinationsTextAsync(userId, petId, cancellationToken));
                    sb.AppendLine();
                    break;
                case MiloPetFactsKinds.Medications:
                    sb.AppendLine(await _petFacts.GetMedicationsTextAsync(userId, petId, cancellationToken));
                    sb.AppendLine();
                    break;
                case MiloPetFactsKinds.LabResults:
                    sb.AppendLine(await _petFacts.GetLabResultsTextAsync(userId, petId, cancellationToken));
                    sb.AppendLine();
                    break;
                case MiloPetFactsKinds.ClinicalExams:
                    sb.AppendLine(await _petFacts.GetClinicalExamsTextAsync(userId, petId, cancellationToken));
                    sb.AppendLine();
                    break;
            }
        }

        return sb.ToString().Trim();
    }

    private static string BuildPetContextPrompt(MiloPetContextDto? pet, bool petHasAccess, string? petRole = null)
    {
        if (pet == null || !petHasAccess)
        {
            return "\n\nNo specific pet is currently selected, or the pet is not verified for this account. Provide general advice only. Do not claim to have read health records.";
        }

        var age = CalculateAgeDisplay(pet.DateOfBirth);
        var viewOnlyNote = string.Equals(petRole, "view_only", StringComparison.OrdinalIgnoreCase)
            ? "\n\nSession access is view-only: do not tell the user you added, edited, or saved health records; use read-only context only."
            : "";
        return $"""


            Currently selected pet (access verified):
            - Name: {pet.Name}
            - Type: {pet.AnimalType}
            - Breed: {pet.Breed}
            - Age: {age}
            - Sex: {pet.Sex}
            - Weight: {(pet.WeightValue.HasValue ? $"{pet.WeightValue} {pet.WeightUnit}" : "unknown")}

            Pet health facts (when provided below) come only from this pet's authorized records.{viewOnlyNote}
            """;
    }

    private static string CalculateAgeDisplay(string? dateOfBirth)
    {
        if (string.IsNullOrWhiteSpace(dateOfBirth) || !DateTime.TryParse(dateOfBirth, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var birth))
            return "unknown";

        var now = DateTime.UtcNow;
        var years = now.Year - birth.Year;
        if (now.DayOfYear < birth.DayOfYear)
            years--;
        var months = (now.Year - birth.Year) * 12 + now.Month - birth.Month;
        if (years <= 0)
            return $"{Math.Max(0, months)} month(s) old";
        return $"{years} year(s) old";
    }

    /// <summary>
    /// Journal-mode Gemini: system persona and <c>summary</c> scribe rules live in
    /// <see cref="ContextEngine.BuildJournalSystemPersonaPrompt"/>—edit prompts there, not here.
    /// </summary>
    private async Task<MiloChatResponse?> RunJournalInterviewAsync(
        string apiKey,
        MiloChatRequest request,
        string petContextBlock,
        Guid userId,
        Guid petId,
        string? petRole,
        CancellationToken cancellationToken)
    {
        var userMessage = NormalizeJournalUserMessage(request.Message);
        if (string.IsNullOrEmpty(userMessage))
            return null;

        var config = await _journalConfig.GetAsync(cancellationToken);
        var ctx = await _petConversationalContext.GetPetConversationalContextAsync(userId, petId, config, cancellationToken)
                  ?? new PetConversationalContextDto();

        var utcNow = DateTime.UtcNow;
        var (hints, tags) = ContextEngine.EvaluateHeuristicGuidance(ctx, config, utcNow);
        var petName = request.Pet?.Name?.Trim() ?? ctx.PetProfile.Name.Trim();
        if (string.IsNullOrEmpty(petName))
            petName = "your pet";

        var userTurnNumber = CountJournalUserTurnsInHistory(request.History) + 1;
        var systemPersona = ContextEngine.BuildJournalSystemPersonaPrompt(petName, config, hints, tags, userTurnNumber);
        if (string.Equals(petRole, "view_only", StringComparison.OrdinalIgnoreCase))
        {
            systemPersona += """

[User access: view-only]
The user has view-only access to this pet's records in PawBuck. Do not offer to add, edit, save, or log health data; keep the conversation informational only.
""";
        }

        var contextBlockText = BuildJournalContextBlock(petName, petContextBlock, ctx, utcNow, request.History, userTurnNumber);
        var contents = BuildJournalContentsWithContextPrefix(contextBlockText, request.History, userMessage);

        const double journalTemperature = 0.7;
        var maxOut = ResolveJournalJsonMaxOutputTokens(config);
        var requestBody = new
        {
            systemInstruction = new { parts = new[] { new { text = systemPersona } } },
            contents,
            generationConfig = new
            {
                temperature = journalTemperature,
                maxOutputTokens = maxOut,
                response_mime_type = "application/json",
                response_schema = new
                {
                    type = "object",
                    properties = new
                    {
                        answer = new { type = "string" },
                        suggestedReplies = new
                        {
                            type = "array",
                            items = new { type = "string" },
                        },
                        status = new
                        {
                            type = "string",
                            @enum = new[] { "CONTINUE", "COMPLETE" },
                        },
                        summary = new { type = "string" },
                        vetNotification = new
                        {
                            type = "object",
                            properties = new
                            {
                                triage = new
                                {
                                    type = "object",
                                    properties = new
                                    {
                                        level = new { type = "string", @enum = new[] { "fyi", "soon", "advice", "emergency" } },
                                        rationale = new { type = "string" },
                                        confidence = new { type = "number" },
                                    },
                                },
                                observations = new
                                {
                                    type = "array",
                                    items = new
                                    {
                                        type = "object",
                                        properties = new
                                        {
                                            taxonomy = new { type = "string" },
                                            displayLabel = new { type = "string" },
                                            primaryChip = new { type = "string" },
                                            userText = new { type = "string" },
                                            onset = new { type = "string" },
                                            frequency = new { type = "string" },
                                            severity = new { type = "string" },
                                            trend = new { type = "string" },
                                            onsetContext = new { type = "string" },
                                            onsetDate = new { type = "string" },
                                            onsetPrecision = new { type = "string" },
                                        },
                                    },
                                },
                                negativeFindings = new
                                {
                                    type = "array",
                                    items = new { type = "string" },
                                },
                                askLine = new { type = "string" },
                            },
                        },
                    },
                    required = new[] { "answer", "suggestedReplies", "status", "summary" },
                },
            },
        };

        var callResult = await ExecuteJournalGeminiWithRetriesAsync(apiKey, requestBody, cancellationToken);
        if (!callResult.Success)
        {
            if (string.IsNullOrEmpty(callResult.UserFacingMessage))
                return null;

            return new MiloChatResponse
            {
                Answer = callResult.UserFacingMessage,
                PetName = request.Pet?.Name,
            };
        }

        var text = callResult.Text;
        if (string.IsNullOrWhiteSpace(text))
            return null;

        MiloJournalInterviewDto dto;
        try
        {
            dto = JsonSerializer.Deserialize<MiloJournalInterviewDto>(text, JsonOptions) ?? new MiloJournalInterviewDto();
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize Milo journal JSON: {Text}", text);
            return null;
        }

        var answer = (dto.Answer ?? "").Trim();
        if (string.IsNullOrEmpty(answer))
            return null;

        if (string.Equals(answer, ContextEngine.JournalEmergencyRedFlagToken, StringComparison.Ordinal))
        {
            Guid emergencyRid;
            try
            {
                emergencyRid = await _journalTurns.RegisterTurnAsync(
                    userId,
                    petId,
                    config.PromptVersion,
                    tags,
                    "journal",
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to register journal turn (emergency stop); continuing without responseId");
                emergencyRid = Guid.Empty;
            }

            var er = emergencyRid == Guid.Empty ? (Guid?)null : emergencyRid;
            return new MiloChatResponse
            {
                Answer =
                    "A red flag you selected means this may be an emergency. Please seek immediate in-person veterinary or ER care now. Do not rely on chat or email for urgent help.",
                JournalSessionComplete = false,
                JournalStatus = "CONTINUE",
                JournalSummary = null,
                SuggestedReplies = Array.Empty<string>(),
                PetName = request.Pet?.Name,
                UsedPetData = true,
                UsedRag = false,
                ResponseId = er,
                TurnId = er.HasValue ? er.Value.ToString("D") : null,
                PromptVersion = config.PromptVersion,
                HeuristicTags = tags,
                JournalEmergencyStop = true,
            };
        }

        var status = (dto.Status ?? "").Trim().Equals("COMPLETE", StringComparison.OrdinalIgnoreCase)
            ? "COMPLETE"
            : "CONTINUE";
        var complete = status == "COMPLETE";
        var summary = (dto.Summary ?? "").Trim();

        if (userTurnNumber >= ContextEngine.JournalInterviewMaxUserTurns)
        {
            complete = true;
            status = "COMPLETE";
            if (string.IsNullOrEmpty(summary) && !string.IsNullOrEmpty(answer))
                summary = answer;
        }
        else if (complete && string.IsNullOrEmpty(summary) && !string.IsNullOrEmpty(answer))
        {
            summary = answer;
        }

        var replies = JournalInterviewOrchestration
            .SanitizeSuggestedReplies(answer, dto.SuggestedReplies)
            .ToList();
        if (complete)
            replies = [];

        Guid responseId;
        try
        {
            responseId = await _journalTurns.RegisterTurnAsync(
                userId,
                petId,
                config.PromptVersion,
                tags,
                "journal",
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to register journal turn; continuing without responseId");
            responseId = Guid.Empty;
        }

        var usedData = ctx.RecentMedicalHistory.Count > 0
            || ctx.RecentJournalNotes.Count > 0
            || ctx.UpcomingMilestones.Count > 0
            || hints.Count > 0;

        var ridJournal = responseId == Guid.Empty ? (Guid?)null : responseId;
        MiloVetMedicalContextDto? vetMed = null;
        if (complete)
            vetMed = VetMedicalContextMapper.FromPetContext(ctx);

        return new MiloChatResponse
        {
            Answer = answer,
            JournalSessionComplete = complete,
            JournalStatus = status,
            JournalSummary = complete ? summary : null,
            SuggestedReplies = replies,
            PetName = request.Pet?.Name,
            UsedPetData = usedData,
            UsedRag = false,
            ResponseId = ridJournal,
            TurnId = ridJournal.HasValue ? ridJournal.Value.ToString("D") : null,
            PromptVersion = config.PromptVersion,
            HeuristicTags = tags,
            VetNotification = complete ? dto.VetNotification : null,
            VetMedicalContext = vetMed,
            JournalEmergencyStop = false,
        };
    }

    private static int CountJournalUserTurnsInHistory(IReadOnlyList<MiloChatHistoryMessage>? history)
    {
        if (history == null || history.Count == 0)
            return 0;
        var n = 0;
        foreach (var h in history)
        {
            if (string.IsNullOrWhiteSpace(h.Content))
                continue;
            if ((h.Role ?? "").Equals("user", StringComparison.OrdinalIgnoreCase))
                n++;
        }

        return n;
    }

    private static string NormalizeJournalUserMessage(string? raw)
    {
        var s = (raw ?? "").Trim();
        if (s.StartsWith("[Journal observation]", StringComparison.OrdinalIgnoreCase))
            return s.Substring("[Journal observation]".Length).Trim();
        if (s.StartsWith("[Journal]", StringComparison.OrdinalIgnoreCase))
            return s.Substring("[Journal]".Length).Trim();
        return s;
    }

    private sealed class MiloJournalInterviewDto
    {
        [JsonPropertyName("answer")]
        public string Answer { get; set; } = "";

        [JsonPropertyName("suggestedReplies")]
        public List<string>? SuggestedReplies { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("summary")]
        public string? Summary { get; set; }

        [JsonPropertyName("vetNotification")]
        public MiloVetNotificationPayloadDto? VetNotification { get; set; }
    }

    private async Task<MiloChatPlanDto?> RunPlanStepAsync(
        string apiKey,
        string userMessage,
        IReadOnlyList<MiloChatHistoryMessage>? history,
        string petContextBlock,
        bool petVerified,
        CancellationToken cancellationToken)
    {
        var historyContents = BuildHistoryContents(history, userMessage, isForPlan: true);
        var planSystem = $"""
            You are a planning module for Milo (PawBuck pet assistant). Respond with JSON only; no user-facing prose.
            Task: decide what structured pet data (if any) is needed to answer the user's message, and whether FAQ documentation retrieval is needed.

            Rules:
            - If no pet is verified for this session, dataNeeded must be ["none"] only.
            - Otherwise, choose one or more from the enum: vaccinations, medications, lab_results, clinical_exams, health_summary, journal, none.
            - Use health_summary when a broad overview of all records is needed; prefer specific categories when the question is narrow.
            - For health-related messages (symptoms, appetite, energy, recovery, behavior, how the pet has been doing), include journal when recent owner-written observations would help; you may use journal alone for journal-only questions.
            - When the user mentions vaccines, boosters, shots, immunizations, titers, or overdue boosters, include vaccinations (or health_summary) in dataNeeded.
            - When the user mentions symptoms, limping, vomiting, energy, appetite, or "how they've been," include journal (and specific health categories as needed) so Milo can synthesize owner observations.
            - needsDocumentationRag: true when the user asks about the PawBuck app, product help, how-to / where in the app, family sharing, invites, pet transfer, pet email, Messages inbox, Settings, notifications, Pawthon walks, vet booking, journal usage, note-taking / logging symptoms or behavior, Milo itself, account deletion, or any topic not answered solely from structured pet rows.
            - For general pet-care or wellness questions where logging observations in PawBuck would help (symptoms, behavior changes, appetite, energy, "should I write this down"), include journal in dataNeeded when a pet is verified and set needsDocumentationRag true so Milo can cite Pet Journal paths from product help. Milo will still answer the care question with brief non-diagnostic tips; RAG is for optional app next steps, not to refuse the question.
            - For pure product how-to ("How do I…", "Where do I…"), prefer dataNeeded ["none"] only unless they also ask to inspect existing records (e.g. "list my overdue vaccines" needs vaccinations).
            - reasoningBrief: one short sentence explaining the plan (internal).

            Pet context:{petContextBlock}
            """;

        if (!petVerified)
            planSystem += "\n\nIMPORTANT: Pet is NOT verified for this account. dataNeeded MUST be [\"none\"] only.";

        var requestBody = new
        {
            systemInstruction = new { parts = new[] { new { text = planSystem } } },
            contents = historyContents,
            generationConfig = new
            {
                temperature = 0.2,
                maxOutputTokens = 512,
                response_mime_type = "application/json",
                response_schema = new
                {
                    type = "object",
                    properties = new
                    {
                        dataNeeded = new
                        {
                            type = "array",
                            items = new
                            {
                                type = "string",
                                @enum = new[]
                                {
                                    MiloPetFactsKinds.Vaccinations,
                                    MiloPetFactsKinds.Medications,
                                    MiloPetFactsKinds.LabResults,
                                    MiloPetFactsKinds.ClinicalExams,
                                    MiloPetFactsKinds.HealthSummary,
                                    MiloPetFactsKinds.Journal,
                                    MiloPetFactsKinds.None,
                                },
                            },
                        },
                        needsDocumentationRag = new { type = "boolean" },
                        reasoningBrief = new { type = "string" },
                    },
                    required = new[] { "dataNeeded", "needsDocumentationRag", "reasoningBrief" },
                },
            },
        };

        var text = await GeminiGenerateContentTextAsync(apiKey, requestBody, GeminiCallKind.ChatPlan, cancellationToken);
        if (string.IsNullOrWhiteSpace(text))
            return null;

        MiloChatPlanDto? dto;
        try
        {
            dto = JsonSerializer.Deserialize<MiloChatPlanDto>(text, JsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize Milo plan JSON: {Text}", text);
            return null;
        }

        return dto;
    }

    /// <summary>For tests: applies the same post-plan guard as <see cref="ChatAsync"/> when the pet is not verified.</summary>
    internal static void ApplyNoPetGuard(MiloChatPlanDto? plan, bool petHasVerifiedAccess)
    {
        if (plan == null || petHasVerifiedAccess)
            return;
        plan.DataNeeded = new List<string> { MiloPetFactsKinds.None };
    }

    private static object[] BuildHistoryContents(IReadOnlyList<MiloChatHistoryMessage>? history, string currentMessage, bool isForPlan)
    {
        var list = new List<object>();
        if (history != null)
        {
            var slice = history.Count <= 10 ? history : history.Skip(history.Count - 10).ToList();
            foreach (var h in slice)
            {
                var role = (h.Role ?? "").Equals("assistant", StringComparison.OrdinalIgnoreCase) ? "model" : "user";
                var content = h.Content ?? "";
                if (string.IsNullOrWhiteSpace(content))
                    continue;
                list.Add(new { role, parts = new[] { new { text = content } } });
            }
        }

        var userText = isForPlan ? $"User message (plan): {currentMessage}" : currentMessage;
        list.Add(new { role = "user", parts = new[] { new { text = userText } } });
        return list.ToArray();
    }

    /// <summary>
    /// First user message = structured context; then optional chat history; final user message = current journal input.
    /// </summary>
    private static object[] BuildJournalContentsWithContextPrefix(
        string contextBlockUserText,
        IReadOnlyList<MiloChatHistoryMessage>? history,
        string currentUserMessage)
    {
        var list = new List<object>
        {
            new { role = "user", parts = new[] { new { text = contextBlockUserText } } },
        };
        if (history != null)
        {
            var slice = history.Count <= 10 ? history : history.Skip(history.Count - 10).ToList();
            foreach (var h in slice)
            {
                var role = (h.Role ?? "").Equals("assistant", StringComparison.OrdinalIgnoreCase) ? "model" : "user";
                var content = h.Content ?? "";
                if (string.IsNullOrWhiteSpace(content))
                    continue;
                list.Add(new { role, parts = new[] { new { text = content } } });
            }
        }

        list.Add(new { role = "user", parts = new[] { new { text = currentUserMessage } } });
        return list.ToArray();
    }

    private static string BuildJournalContextBlock(
        string petName,
        string petContextBlock,
        PetConversationalContextDto ctx,
        DateTime utcNow,
        IReadOnlyList<MiloChatHistoryMessage>? history,
        int userTurnNumber)
    {
        var sb = new StringBuilder();
        sb.AppendLine("=== Session context (authorized) ===");
        sb.AppendLine($"Current date (UTC): {utcNow:yyyy-MM-dd}");
        sb.AppendLine();

        if (ContextEngine.HasMedicalEventWithinLastDays(ctx, 7, utcNow))
        {
            sb.AppendLine(
                "Instruction: A medical event occurred recently; prioritize checking for side effects or recovery progress.");
        }
        else
        {
            sb.AppendLine(BuildJournalMobilityFallbackInstruction(petName, ctx.PetProfile));
        }

        sb.AppendLine();
        sb.AppendLine("Pet profile (from app):");
        sb.AppendLine(petContextBlock.Trim());
        sb.AppendLine();
        sb.AppendLine("Last medical events (up to 3):");
        var three = ctx.RecentMedicalHistory.Take(3).ToList();
        if (three.Count == 0)
            sb.AppendLine("(none in window)");
        else
        {
            foreach (var e in three)
                sb.Append("- ").Append(e.Type).Append(": ").Append(e.Name).Append(" (").Append(e.Date).AppendLine(")");
        }

        if (ctx.UpcomingMilestones.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Upcoming milestones:");
            foreach (var m in ctx.UpcomingMilestones.Take(2))
                sb.Append("- ").Append(m.Label).Append(" — ").AppendLine(m.DueDate);
        }

        var scan = JournalInterviewOrchestration.ComputeContextScanState(ctx, utcNow);
        JournalInterviewOrchestration.AppendPhaseThreeContextualScan(sb, scan, petName);
        JournalInterviewOrchestration.AppendTurnDirective(sb, scan, history, userTurnNumber, petName);
        sb.AppendLine();
        sb.AppendLine(ContextEngine.FormatContextForPrompt(ctx));

        return sb.ToString().TrimEnd();
    }

    private static string BuildJournalMobilityFallbackInstruction(string petName, PetProfileSnapshot profile)
    {
        var lifeStage = profile.IsSenior ? "a senior companion" : "a younger companion";
        var age = string.IsNullOrWhiteSpace(profile.AgeDisplay) ? "unknown age" : profile.AgeDisplay;
        return
            $"Instruction: {petName} is {lifeStage} ({age}); focus on mobility, stamina, and how they are moving today — without asking about travel, diet, or household changes unless the user already brought those up.";
    }

    /// <summary>
    /// JSON-mode journal output needs enough tokens; keep a floor even if admin lowers <see cref="MiloJournalConfigSnapshot.JournalMaxOutputTokens"/>.
    /// </summary>
    private static int ResolveJournalJsonMaxOutputTokens(MiloJournalConfigSnapshot config)
    {
        const int jsonFloor = 512;
        return Math.Clamp(config.JournalMaxOutputTokens, jsonFloor, 8192);
    }

    /// <summary>
    /// Retries 429 (respect Retry-After) and transient 5xx; exhausted attempts yield <see cref="GeminiJournalCallResult.Napping"/>.
    /// </summary>
    private async Task<GeminiJournalCallResult> ExecuteJournalGeminiWithRetriesAsync(
        string apiKey,
        object requestBody,
        CancellationToken cancellationToken)
    {
        const int maxAttempts = 4;
        for (var attempt = 0; attempt < maxAttempts; attempt++)
        {
            try
            {
                var text = await SendJournalGeminiSingleRequestAsync(apiKey, requestBody, cancellationToken);
                return GeminiJournalCallResult.Ok(text);
            }
            catch (GeminiRateLimitException ex)
            {
                if (attempt == maxAttempts - 1)
                {
                    _logger.LogWarning(ex, "Gemini journal: rate limit retries exhausted");
                    return GeminiJournalCallResult.Napping();
                }

                var delay = ex.RetryAfter ?? TimeSpan.FromSeconds(2);
                await Task.Delay(delay, cancellationToken);
            }
            catch (HttpRequestException ex)
            {
                if (attempt == maxAttempts - 1)
                {
                    _logger.LogWarning(ex, "Gemini journal: transient HTTP retries exhausted");
                    return GeminiJournalCallResult.Napping();
                }

                var backoffMs = 250 * (1 << attempt);
                await Task.Delay(TimeSpan.FromMilliseconds(backoffMs), cancellationToken);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Gemini journal: non-retryable response");
                return new GeminiJournalCallResult(false, null, null);
            }
        }

        return GeminiJournalCallResult.Napping();
    }

    private async Task<string> SendJournalGeminiSingleRequestAsync(
        string apiKey,
        object requestBody,
        CancellationToken cancellationToken)
    {
        var result = await _geminiGenerate.GenerateContentAsync(
            GeminiCallKind.ChatJournal,
            ResolveGenerateModel(),
            requestBody,
            apiKey,
            cancellationToken);

        if (result.StatusCode == HttpStatusCode.TooManyRequests)
            throw new GeminiRateLimitException("Gemini rate limited (429)", result.RetryAfter);

        if (!result.Success)
        {
            if ((int)result.StatusCode >= 500 && (int)result.StatusCode <= 599)
            {
                throw new HttpRequestException(
                    $"Gemini returned {(int)result.StatusCode}: {result.ResponseJson[..Math.Min(200, result.ResponseJson.Length)]}");
            }

            _logger.LogWarning(
                "Gemini journal generateContent returned {StatusCode}: {Body}",
                (int)result.StatusCode,
                result.ResponseJson.Length > 400 ? result.ResponseJson[..400] : result.ResponseJson);
            throw new InvalidOperationException($"Gemini journal API error: {(int)result.StatusCode}");
        }

        if (!GeminiResponseParser.TryExtractCandidateText(result.ResponseJson, out var text) || string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException("Gemini journal returned empty candidate text");

        return text;
    }

    private static TimeSpan? TryParseRetryAfterHeader(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Retry-After", out var values))
            return null;
        var raw = values.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        if (int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var seconds))
            return TimeSpan.FromSeconds(seconds);
        if (DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var retryAt))
        {
            var delay = retryAt.ToUniversalTime() - DateTime.UtcNow;
            return delay > TimeSpan.Zero ? delay : TimeSpan.FromSeconds(1);
        }

        return null;
    }

    private static bool TryExtractGeminiCandidateText(string json, [NotNullWhen(true)] out string? text)
    {
        text = null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                return false;
            var candidate = candidates[0];
            if (!candidate.TryGetProperty("content", out var contentEl))
                return false;
            if (!contentEl.TryGetProperty("parts", out var parts) || parts.GetArrayLength() == 0)
                return false;
            if (!parts[0].TryGetProperty("text", out var textEl))
                return false;
            text = textEl.GetString();
            return !string.IsNullOrWhiteSpace(text);
        }
        catch
        {
            return false;
        }
    }

    private async Task<string> RunAnswerStepAsync(
        string apiKey,
        string userMessage,
        IReadOnlyList<MiloChatHistoryMessage>? history,
        string petContextBlock,
        string factsText,
        string? ragBlock,
        string? curatedBlock,
        bool productHelpFocus,
        CancellationToken cancellationToken)
    {
        var factsSection = string.IsNullOrWhiteSpace(factsText)
            ? "(No pet health rows were loaded for this reply.)"
            : factsText;

        var ragSection = string.IsNullOrWhiteSpace(ragBlock)
            ? "(No FAQ documentation context was retrieved.)"
            : ragBlock;

        var curatedSection = string.IsNullOrWhiteSpace(curatedBlock)
            ? "(No curated educational snippets were retrieved.)"
            : curatedBlock;

        var answerSystem = productHelpFocus
            ? $"""
                Role: Milo, PawBuck pet care assistant and product guide. Sign-off: 🐕.

                Task: Help with the owner's question. Prefer FAQ / product documentation below for anything about how to use PawBuck (screens, steps, policies). For general pet-care, wellness, behavior, training, noise sensitivity, feeding amounts, or similar questions that documentation does not fully answer, give brief practical guidance—do not refuse solely because FAQ docs omit that topic.

                Rules:
                - Use Markdown: `###` headings when helpful, numbered steps for in-app navigation or short tip lists.
                - App how-to: Do not invent app screens, menu labels, or policies that are not supported by the documentation text. When docs support a path (for example **Pet Journal**), include short grounded steps.
                - General pet care (when docs do not cover the substance of the question):
                  - Answer helpfully in plain language with a few concrete tips (about 3–5 short bullets or short paragraphs).
                  - NO diagnosis, disease labels as conclusions, or medication doses / schedules.
                  - Always include: "Please consult your veterinarian for a professional diagnosis and before making changes to your pet's medical care."
                  - For emergencies (poisoning, trauma, seizures, collapse, trouble breathing), lead with urgent veterinary / ER care.
                - Do NOT make "the provided documentation does not contain…" the main answer for ordinary care questions. Help first; optionally add one short line on logging related observations in PawBuck when documentation supports that path.
                - Use **Contact Us** (Profile → Help & Support) for account, billing, or app-bug issues—not as a substitute for answering care questions.
                - After the answer, at most one short encouraging PawBuck next step when it fits (e.g. log an observation in **Pet Journal**)—ground paths in the documentation above; otherwise skip.
                - Max ~320 words.

                {petContextBlock}

                FAQ / product documentation (use for app how-to; may be empty or off-topic for care substance):
                ---
                {ragSection}
                ---

                Pet health facts (may be empty):
                ---
                {factsSection}
                ---
                """
            : $"""
                Role: Milo, PawBuck's clinical scribe. Use pet-related expressions sparingly. Sign-off: 🐕.

                PRIMARY JOB: Synthesize this pet's data from the facts below when records exist. Always prioritize summarizing and organizing existing records (journal, vaccines, medications, labs, exams) when they answer the question. When facts are thin or empty and the user asks a general wellness, behavior, training, noise, appetite, or feeding question, give brief non-diagnostic practical tips (with the vet disclaimer)—do not apologize that FAQ documentation is missing and do not invent records.

                Use ONLY the facts and documentation below for claims about THIS pet's history; do not invent records.
                When curated educational snippets are present, cite ONLY numeric ranges or general facts from that block—never invent breed statistics.

                PawBuck next step (encourage app use without being salesy):
                - When facts are thin, the user describes new symptoms/behavior/appetite/energy changes, or asks about tracking or note-taking, close with at most one practical PawBuck suggestion: **Pet journal** for owner observations (Home → Pet Journal, or Milo journal check-in), **Health Records** for uploading vet paperwork, or **vet booking** when they mention scheduling—use FAQ paths only when supported below; otherwise keep it generic ("log it in Pet Journal").
                - Do not let this replace record synthesis, medical guidance, or the vet disclaimer.

                Operational rules:
                - OPENING: When retrieved pet health facts contain concrete rows relevant to the question, the FIRST line of your reply MUST be exactly the Markdown header `### Summary` (level 3). The paragraph(s) immediately under it must be grounded ONLY in retrieved pet facts (pet name, dates, statuses from the facts block). Use **bold** for important clinical labels (vaccines, meds, labs, findings). After Summary you may use additional `###` sections and bullets. When facts are empty/thin and the question is general care (not a request to list this pet's records), skip an empty Summary and answer with helpful tips instead.
                - AMBER (needs review / critical): Use a single line starting with `> **Needs review:**` for overdue vaccines, mismatches, or concerning trends that should be double-checked with a vet. Use `> **Critical symptom:**` for urgent or worsening signs described in the journal or facts. These lines must mirror the facts block only.
                - TEAL (completed / confirmed): Use a line starting with `> **Completed record:**` when stating something clearly documented as done, current, or neutral from the facts (e.g. a logged vaccine on file). Legacy prefix `> **From your records:**` is also acceptable for neutral confirmations.
                - NO diagnosis or prescription: explain symptoms generally; never name a disease or dose a medication.
                - Vet disclaimer: For health-related replies, include: "Please consult your veterinarian for a professional diagnosis and before making changes to your pet's medical care."
                - EMERGENCY: For acute symptoms (poisoning, trauma, seizures), lead with urgent veterinary care inside Summary or the first lines.
                - Max ~250 words unless the user explicitly needs more detail tied to their records.

                {petContextBlock}

                Retrieved pet health facts (authorized):
                ---
                {factsSection}
                ---

                FAQ / product documentation context (may be empty):
                ---
                {ragSection}
                ---

                Curated educational snippets (may be empty; general education only—not veterinary advice):
                ---
                {curatedSection}
                ---
                """;

        var contents = BuildHistoryContents(history, userMessage, isForPlan: false);
        var requestBody = new
        {
            systemInstruction = new { parts = new[] { new { text = answerSystem } } },
            contents,
            generationConfig = new { temperature = 0.7, maxOutputTokens = 1024 },
        };

        return await GeminiGenerateContentTextAsync(apiKey, requestBody, GeminiCallKind.ChatAnswer, cancellationToken) ?? "";
    }

    private static string BuildCuratedBlock(IReadOnlyList<MiloCuratedSnippetDto> snippets)
    {
        var sb = new StringBuilder();
        for (var i = 0; i < snippets.Count; i++)
        {
            var s = snippets[i];
            sb.AppendLine($"[Curated {i + 1}] topic={s.Topic}");
            sb.AppendLine(s.Content);
            sb.AppendLine($"Attribution: {s.SourceAttribution}");
            sb.AppendLine();
        }

        return sb.ToString().TrimEnd();
    }

    private string ResolveGenerateModel() =>
        string.IsNullOrWhiteSpace(_geminiOptions.Value.Model)
            ? GeminiOptions.DefaultModelId
            : _geminiOptions.Value.Model!.Trim();

    private async Task<string?> GeminiGenerateContentTextAsync(
        string apiKey,
        object requestBody,
        string operationKind,
        CancellationToken cancellationToken)
    {
        var result = await _geminiGenerate.GenerateContentAsync(
            operationKind,
            ResolveGenerateModel(),
            requestBody,
            apiKey,
            cancellationToken);
        if (!result.Success)
        {
            _logger.LogWarning(
                "Gemini generateContent returned {StatusCode} kind={Kind}: {Body}",
                (int)result.StatusCode,
                operationKind,
                result.ResponseJson.Length > 400 ? result.ResponseJson[..400] : result.ResponseJson);
            return null;
        }

        if (!GeminiResponseParser.TryExtractCandidateText(result.ResponseJson, out var text))
        {
            _logger.LogWarning("Failed to parse Gemini response JSON or empty candidate text kind={Kind}", operationKind);
            return null;
        }

        return text;
    }

    private static bool IsExplicitJournalTopicSelection(MiloChatRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.JournalTreeId))
            return true;

        var msg = (request.Message ?? "").Trim();
        if (string.IsNullOrEmpty(msg))
            return false;

        if (string.Equals(msg, JournalWellnessCheckInHelper.AllGoodTodayChip, StringComparison.OrdinalIgnoreCase))
            return true;

        foreach (var chip in JournalWellnessCheckInHelper.SymptomTopicChipsForSelection)
        {
            if (string.Equals(msg, chip, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        var t = msg.ToLowerInvariant();
        if (t.Contains("vomit") || t.Contains("diarr") || t.Contains("throw up"))
            return true;
        if (t.Contains("letharg") || t.Contains("low energy") || t.Contains("tired"))
            return true;
        if (t.Contains("appetite") || t.Contains("off food") || t.Contains("not eating"))
            return true;
        if (t.Contains("itch") || t.Contains("scratch"))
            return true;
        if (t.Contains("limp") || t.Contains("lameness"))
            return true;
        if (t.Contains("cough") || t.Contains("breath"))
            return true;
        if (t.Contains("eye") || t.Contains("ear"))
            return true;

        return false;
    }
}
