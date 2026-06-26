using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Combines KnowledgeBase context with MILO_MASTER_PROMPT and Gemini to produce MiloQueryResponse.
/// Falls back to General Help when no context is found.
/// </summary>
public class MiloRagService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public static readonly string MILO_MASTER_PROMPT = """
You are Milo, the friendly and knowledgeable assistant for the Paw Buck pet health ecosystem. You help pet owners with questions about the Paw Buck app, pet health records, vaccinations, medications, and general pet care.

Rules:
- Answer ONLY using the provided context below. If the context does not contain enough information to answer the question, say so and suggest the user contact support or check the app.
- Be concise, accurate, and helpful. Use a warm, professional tone.
- Do not make up information. If you don't know, say you don't know and point the user to where they can find help.
- When the context supports it, briefly encourage a relevant PawBuck habit (e.g. log observations in **Pet journal**, upload records in **Health Records**) in one sentence—warm, not salesy.
- Format answers for readability (short paragraphs or bullet points when appropriate).

Context from the knowledge base:
---
{0}
---

User question: {1}
""";

    public static readonly string GENERAL_HELP_RESPONSE = """
I couldn't find specific information in our FAQ for your question. Here are some ways to get help:

• **In the app**: Use Settings > Help or the FAQ section for common topics.
• **Contact support**: Reach out through the app's contact option or email support for personalized help.
• **Pet health**: For urgent health concerns, always contact your veterinarian.

If you tell me more about what you're trying to do, I can try to point you in the right direction.
""";

    private readonly IKnowledgeBaseService _knowledgeBase;
    private readonly IGeminiGenerateContentService _geminiGenerate;
    private readonly IOptions<GeminiOptions> _options;
    private readonly ILogger<MiloRagService> _logger;

    public MiloRagService(
        IKnowledgeBaseService knowledgeBase,
        IGeminiGenerateContentService geminiGenerate,
        IOptions<GeminiOptions> options,
        ILogger<MiloRagService> logger)
    {
        _knowledgeBase = knowledgeBase;
        _geminiGenerate = geminiGenerate;
        _options = options;
        _logger = logger;
    }

    /// <summary>
    /// Answers the user question using RAG context, or returns General Help when no context is found.
    /// </summary>
    public async Task<MiloQueryResponse> AskAsync(string question, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(question))
        {
            return new MiloQueryResponse
            {
                Answer = GENERAL_HELP_RESPONSE,
                UsedContext = false,
                IsGeneralHelp = true
            };
        }

        var boost = MiloDocumentationRagHeuristic.GetBoostSourceFiles(question);
        var chunks = await _knowledgeBase.GetContextAsync(
            question,
            matchCount: 5,
            cancellationToken,
            boost.Count > 0 ? boost : null);
        var contextText = chunks.Count > 0
            ? string.Join("\n\n", chunks.Select(c => c.Content))
            : null;
        var sourceIds = chunks.Select(c => c.Id.ToString()).ToList();

        if (string.IsNullOrWhiteSpace(contextText))
        {
            _logger.LogInformation("No RAG context found for question; returning General Help");
            return new MiloQueryResponse
            {
                Answer = GENERAL_HELP_RESPONSE,
                UsedContext = false,
                IsGeneralHelp = true
            };
        }

        var prompt = string.Format(MILO_MASTER_PROMPT, contextText, question);
        var apiKey = _options.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("Gemini API key not configured; returning General Help");
            return new MiloQueryResponse
            {
                Answer = GENERAL_HELP_RESPONSE,
                UsedContext = false,
                IsGeneralHelp = true
            };
        }

        var requestBody = new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } },
            generationConfig = new { temperature = 0.3, maxOutputTokens = 1024 }
        };

        var model = string.IsNullOrWhiteSpace(_options.Value.Model)
            ? GeminiOptions.DefaultModelId
            : _options.Value.Model!.Trim();

        var result = await _geminiGenerate.GenerateContentAsync(
            GeminiCallKind.MiloAsk,
            model,
            requestBody,
            apiKey,
            cancellationToken);
        if (!result.Success)
        {
            _logger.LogWarning(
                "Gemini generateContent returned {StatusCode}: {Body}",
                result.StatusCode,
                result.ResponseJson.Length > 400 ? result.ResponseJson[..400] : result.ResponseJson);
            return new MiloQueryResponse
            {
                Answer = GENERAL_HELP_RESPONSE,
                UsedContext = false,
                IsGeneralHelp = true
            };
        }

        if (!GeminiResponseParser.TryExtractCandidateText(result.ResponseJson, out var answer) || string.IsNullOrWhiteSpace(answer))
        {
            return new MiloQueryResponse
            {
                Answer = GENERAL_HELP_RESPONSE,
                UsedContext = false,
                IsGeneralHelp = true
            };
        }

        return new MiloQueryResponse
        {
            Answer = answer.Trim(),
            UsedContext = true,
            SourceIds = sourceIds,
            IsGeneralHelp = false
        };
    }
}
