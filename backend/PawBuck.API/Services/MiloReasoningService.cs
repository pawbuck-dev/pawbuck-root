using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Plan (structured JSON) → fetch pet facts (Npgsql) → optional RAG → final answer (Gemini).
/// </summary>
public class MiloReasoningService : IMiloReasoningService
{
    private const string GenerateModel = "gemini-2.0-flash";
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IMiloPetFactsService _petFacts;
    private readonly IKnowledgeBaseService _knowledgeBase;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<GeminiOptions> _geminiOptions;
    private readonly IOptions<MiloOptions> _miloOptions;
    private readonly ILogger<MiloReasoningService> _logger;

    public MiloReasoningService(
        IMiloPetFactsService petFacts,
        IKnowledgeBaseService knowledgeBase,
        IHttpClientFactory httpClientFactory,
        IOptions<GeminiOptions> geminiOptions,
        IOptions<MiloOptions> miloOptions,
        ILogger<MiloReasoningService> logger)
    {
        _petFacts = petFacts;
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

    private async Task<string?> GeminiGenerateContentTextAsync(string apiKey, object requestBody, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("Gemini");
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{GenerateModel}:generateContent?key={apiKey}";
        using var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };

        var httpResponse = await client.SendAsync(request, cancellationToken);
        if (!httpResponse.IsSuccessStatusCode)
        {
            var body = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Gemini generateContent returned {StatusCode}: {Body}", httpResponse.StatusCode, body);
            return null;
        }

        var json = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var candidate = root.GetProperty("candidates")[0];
            var parts = candidate.GetProperty("content").GetProperty("parts");
            return parts[0].GetProperty("text").GetString();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Gemini response JSON");
            return null;
        }
    }
}
