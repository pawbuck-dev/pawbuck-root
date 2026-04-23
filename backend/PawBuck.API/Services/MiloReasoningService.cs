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
    private readonly IKnowledgeBaseService _knowledgeBase;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<GeminiOptions> _geminiOptions;
    private readonly IOptions<MiloOptions> _miloOptions;
    private readonly ILogger<MiloReasoningService> _logger;

    public MiloReasoningService(
        IMiloPetFactsService petFacts,
        IPetConversationalContextService petConversationalContext,
        IMiloJournalConfigProvider journalConfig,
        IMiloJournalTurnService journalTurns,
        IKnowledgeBaseService knowledgeBase,
        IHttpClientFactory httpClientFactory,
        IOptions<GeminiOptions> geminiOptions,
        IOptions<MiloOptions> miloOptions,
        ILogger<MiloReasoningService> logger)
    {
        _petFacts = petFacts;
        _petConversationalContext = petConversationalContext;
        _journalConfig = journalConfig;
        _journalTurns = journalTurns;
        _knowledgeBase = knowledgeBase;
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

        var petOwned = petId.HasValue && await _petFacts.VerifyPetOwnershipAsync(userId, petId.Value, cancellationToken);
        if (petId.HasValue && !petOwned)
        {
            return new MiloChatResponse
            {
                Answer = "I can't access health data for this pet. Please select a pet you own or sign in again.",
                PetName = request.Pet?.Name,
            };
        }

        if (request.JournalMode && (!petId.HasValue || !petOwned))
        {
            return new MiloChatResponse
            {
                Answer = "Please select a pet you own to use journal chat.",
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

        var petContextBlock = BuildPetContextPrompt(request.Pet, petOwned);

        if (request.JournalMode && petId.HasValue && petOwned)
        {
            var journalResponse = await RunJournalInterviewAsync(
                apiKey,
                request,
                petContextBlock,
                userId,
                petId.Value,
                cancellationToken);
            if (journalResponse != null)
                return journalResponse;

            return new MiloChatResponse
            {
                Answer = "Sorry, I'm having trouble. Please try again! 🐕",
                PetName = request.Pet?.Name,
            };
        }

        var plan = await RunPlanStepAsync(apiKey, message, request.History, petContextBlock, petOwned, cancellationToken);
        if (plan == null)
        {
            return new MiloChatResponse
            {
                Answer = "Sorry, I'm having trouble planning a response. Please try again! 🐕",
                PetName = request.Pet?.Name,
            };
        }

        ApplyNoPetGuard(plan, petOwned);

        var kinds = MiloPlanNormalizer.NormalizeDataNeeded(plan.DataNeeded, _logger);
        var factsText = "";
        var usedPetData = false;
        if (petOwned && petId.HasValue && kinds.Count > 0)
        {
            usedPetData = true;
            factsText = await FetchFactsByKindsAsync(userId, petId.Value, kinds, cancellationToken);
        }

        var usedRag = false;
        string? ragBlock = null;
        if (plan.NeedsDocumentationRag)
        {
            var chunks = await _knowledgeBase.GetContextAsync(message, 5, cancellationToken);
            if (chunks.Count > 0)
            {
                usedRag = true;
                var sb = new StringBuilder();
                for (var i = 0; i < chunks.Count; i++)
                    sb.AppendLine($"[Doc {i + 1}] {chunks[i].Content}");
                ragBlock = sb.ToString();
            }
        }

        var answer = await RunAnswerStepAsync(
            apiKey,
            message,
            request.History,
            petContextBlock,
            factsText,
            ragBlock,
            cancellationToken);

        var exposePlan = _miloOptions.Value.ExposePlanSummary;
        var planSummary = exposePlan
            ? $"{plan.ReasoningBrief ?? ""} | dataNeeded: [{string.Join(", ", plan.DataNeeded ?? new List<string>())}] | rag: {plan.NeedsDocumentationRag}"
            : null;

        return new MiloChatResponse
        {
            Answer = string.IsNullOrWhiteSpace(answer)
                ? "I couldn't come up with a response. Could you try rephrasing? 🐕"
                : answer.Trim(),
            UsedPetData = usedPetData,
            UsedRag = usedRag,
            PlanSummary = planSummary,
            PetName = request.Pet?.Name,
        };
    }

    private async Task<string> FetchFactsByKindsAsync(
        Guid userId,
        Guid petId,
        IReadOnlyList<string> kinds,
        CancellationToken cancellationToken)
    {
        var sb = new StringBuilder();
        foreach (var k in kinds)
        {
            switch (k)
            {
                case MiloPetFactsKinds.HealthSummary:
                    return await _petFacts.GetHealthSummaryTextAsync(userId, petId, cancellationToken);
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

    private static string BuildPetContextPrompt(MiloPetContextDto? pet, bool petOwned)
    {
        if (pet == null || !petOwned)
        {
            return "\n\nNo specific pet is currently selected, or the pet is not verified for this account. Provide general advice only. Do not claim to have read health records.";
        }

        var age = CalculateAgeDisplay(pet.DateOfBirth);
        return $"""


            Currently selected pet (verified):
            - Name: {pet.Name}
            - Type: {pet.AnimalType}
            - Breed: {pet.Breed}
            - Age: {age}
            - Sex: {pet.Sex}
            - Weight: {pet.WeightValue} {pet.WeightUnit}

            Pet health facts (when provided below) come only from this pet's authorized records.
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

    private async Task<MiloChatResponse?> RunJournalInterviewAsync(
        string apiKey,
        MiloChatRequest request,
        string petContextBlock,
        Guid userId,
        Guid petId,
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

        var systemPersona = ContextEngine.BuildJournalSystemPersonaPrompt(petName, config, hints, tags);
        var contextBlockText = BuildJournalContextBlock(petName, petContextBlock, ctx, utcNow);
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
                        journalSessionComplete = new { type = "boolean" },
                    },
                    required = new[] { "answer", "suggestedReplies", "journalSessionComplete" },
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

        var complete = dto.JournalSessionComplete;
        var replies = (dto.SuggestedReplies ?? new List<string>())
            .Where(static s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Take(4)
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

        return new MiloChatResponse
        {
            Answer = answer,
            JournalSessionComplete = complete,
            SuggestedReplies = replies,
            PetName = request.Pet?.Name,
            UsedPetData = usedData,
            UsedRag = false,
            ResponseId = responseId == Guid.Empty ? null : responseId,
            PromptVersion = config.PromptVersion,
            HeuristicTags = tags,
        };
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

        [JsonPropertyName("journalSessionComplete")]
        public bool JournalSessionComplete { get; set; }
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
            - Otherwise, choose one or more from the enum: vaccinations, medications, lab_results, clinical_exams, health_summary, none.
            - Use health_summary when a broad overview of all records is needed; prefer specific categories when the question is narrow.
            - needsDocumentationRag: true when the user asks about the PawBuck app, product help, or general topics not fully covered by pet records.
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

        var text = await GeminiGenerateContentTextAsync(apiKey, requestBody, cancellationToken);
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
    internal static void ApplyNoPetGuard(MiloChatPlanDto? plan, bool petOwned)
    {
        if (plan == null || petOwned)
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
        DateTime utcNow)
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

        return sb.ToString().TrimEnd();
    }

    private static string BuildJournalMobilityFallbackInstruction(string petName, PetProfileSnapshot profile)
    {
        var lifeStage = profile.IsSenior ? "a senior companion" : "a younger companion";
        var age = string.IsNullOrWhiteSpace(profile.AgeDisplay) ? "unknown age" : profile.AgeDisplay;
        return
            $"Instruction: {petName} is {lifeStage} ({age}); focus on mobility and activity levels, especially after travel or a change in routine.";
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
        var client = _httpClientFactory.CreateClient("Gemini");
        var model = ResolveGenerateModel();
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
        using var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        request.SetGeminiApiKey(apiKey);

        using var httpResponse = await client.SendAsync(request, cancellationToken);
        var body = await httpResponse.Content.ReadAsStringAsync(cancellationToken);

        if (httpResponse.StatusCode == HttpStatusCode.TooManyRequests)
        {
            var retryAfter = TryParseRetryAfterHeader(httpResponse);
            throw new GeminiRateLimitException("Gemini rate limited (429).", retryAfter);
        }

        if ((int)httpResponse.StatusCode >= 500 && (int)httpResponse.StatusCode <= 599)
            throw new HttpRequestException($"Gemini returned {(int)httpResponse.StatusCode}: {body[..Math.Min(200, body.Length)]}");

        if (!httpResponse.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gemini journal generateContent returned {StatusCode}: {Body}", httpResponse.StatusCode, body);
            throw new InvalidOperationException($"Gemini journal error {(int)httpResponse.StatusCode}");
        }

        if (!TryExtractGeminiCandidateText(body, out var text) || string.IsNullOrWhiteSpace(text))
        {
            _logger.LogWarning("Gemini journal: missing candidate text in response");
            throw new InvalidOperationException("Gemini journal: empty candidate text");
        }

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
        CancellationToken cancellationToken)
    {
        var factsSection = string.IsNullOrWhiteSpace(factsText)
            ? "(No pet health rows were loaded for this reply.)"
            : factsText;

        var ragSection = string.IsNullOrWhiteSpace(ragBlock)
            ? "(No FAQ documentation context was retrieved.)"
            : ragBlock;

        var answerSystem = $"""
            Role: Milo, PawBuck's AI Pet Care Assistant. Use pet-related expressions sparingly. Sign-off: 🐕.
            Mission: Provide helpful, evidence-aware pet care guidance. Use ONLY the facts and documentation below when answering; do not invent records.

            Operational rules:
            - DATA-FIRST when facts are provided: ground answers in them.
            - NO diagnosis or prescription: explain symptoms generally; never name a disease or dose a medication.
            - Vet disclaimer: For health-related replies, include: "Please consult your veterinarian for a professional diagnosis and before making changes to your pet's medical care."
            - EMERGENCY: For acute symptoms (poisoning, trauma, seizures), lead with urgent veterinary care.
            - Markdown headers and bullets when helpful. Max ~250 words unless the user needs step-by-step detail.

            {petContextBlock}

            Retrieved pet health facts (authorized):
            ---
            {factsSection}
            ---

            FAQ / product documentation context (may be empty):
            ---
            {ragSection}
            ---
            """;

        var contents = BuildHistoryContents(history, userMessage, isForPlan: false);
        var requestBody = new
        {
            systemInstruction = new { parts = new[] { new { text = answerSystem } } },
            contents,
            generationConfig = new { temperature = 0.7, maxOutputTokens = 1024 },
        };

        return await GeminiGenerateContentTextAsync(apiKey, requestBody, cancellationToken) ?? "";
    }

    private string ResolveGenerateModel() =>
        string.IsNullOrWhiteSpace(_geminiOptions.Value.Model)
            ? GeminiOptions.DefaultModelId
            : _geminiOptions.Value.Model!.Trim();

    private async Task<string?> GeminiGenerateContentTextAsync(string apiKey, object requestBody, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("Gemini");
        var model = ResolveGenerateModel();
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
        using var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        request.SetGeminiApiKey(apiKey);

        var httpResponse = await client.SendAsync(request, cancellationToken);
        if (!httpResponse.IsSuccessStatusCode)
        {
            var body = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Gemini generateContent returned {StatusCode}: {Body}", httpResponse.StatusCode, body);
            return null;
        }

        var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        if (!TryExtractGeminiCandidateText(json, out var text))
        {
            _logger.LogWarning("Failed to parse Gemini response JSON or empty candidate text");
            return null;
        }

        return text;
    }
}
