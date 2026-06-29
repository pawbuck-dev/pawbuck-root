using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Optional Milo copy for proactive nudges (Phase C). Templates are always the safe default.</summary>
public sealed class MiloNudgeCopyService : IMiloNudgeCopyService
{
    private static readonly Regex UnsafePattern = new(
        @"\b(diagnos|prescri|dosage|mg/kg|antibiotic|steroid|treatment plan|your pet has|likely has|probably has)\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private readonly IOptionsMonitor<CareNudgesOptions> _careNudgesOptions;
    private readonly IOptions<GeminiOptions> _geminiOptions;
    private readonly IGeminiGenerateContentService _geminiGenerate;
    private readonly ILogger<MiloNudgeCopyService> _logger;

    public MiloNudgeCopyService(
        IOptionsMonitor<CareNudgesOptions> careNudgesOptions,
        IOptions<GeminiOptions> geminiOptions,
        IGeminiGenerateContentService geminiGenerate,
        ILogger<MiloNudgeCopyService> logger)
    {
        _careNudgesOptions = careNudgesOptions;
        _geminiOptions = geminiOptions;
        _geminiGenerate = geminiGenerate;
        _logger = logger;
    }

    public MiloNudgeCopyResponse GetTemplateFallback(MiloNudgeCopyRequest request)
    {
        var body = BuildTemplateBody(request);
        return new MiloNudgeCopyResponse
        {
            Body = body,
            UsedMilo = false,
            UsedFallback = true,
        };
    }

    public async Task<MiloNudgeCopyResponse> GenerateCopyAsync(
        MiloNudgeCopyRequest request,
        Guid? userId,
        Guid? petId,
        CancellationToken cancellationToken = default)
    {
        if (!_careNudgesOptions.CurrentValue.MiloCopyEnabled)
            return GetTemplateFallback(request);

        if (!IsMiloEligibleKind(request.Kind))
            return GetTemplateFallback(request);

        var apiKey = _geminiOptions.Value.ApiKey?.Trim();
        if (string.IsNullOrEmpty(apiKey))
            return GetTemplateFallback(request);

        var model = string.IsNullOrWhiteSpace(_geminiOptions.Value.Model)
            ? GeminiOptions.DefaultModelId
            : _geminiOptions.Value.Model!.Trim();

        var prompt = BuildPrompt(request);
        var requestBody = new
        {
            contents = new[] { new { role = "user", parts = new[] { new { text = prompt } } } },
            generationConfig = new { temperature = 0.4, maxOutputTokens = 120 },
        };

        var result = await _geminiGenerate.GenerateContentAsync(
            GeminiCallKind.ProactiveNudgeCopy,
            model,
            requestBody,
            apiKey,
            cancellationToken);

        if (!result.Success)
        {
            _logger.LogWarning("Milo nudge copy Gemini HTTP {Status}", (int)result.StatusCode);
            return GetTemplateFallback(request);
        }

        if (!GeminiResponseParser.TryExtractCandidateText(result.ResponseJson, out var text)
            || string.IsNullOrWhiteSpace(text))
        {
            return GetTemplateFallback(request);
        }

        var cleaned = SanitizeCopy(text);
        if (!IsSafeCopy(cleaned))
        {
            _logger.LogWarning("Milo nudge copy rejected unsafe output for kind {Kind}", request.Kind);
            return GetTemplateFallback(request);
        }

        return new MiloNudgeCopyResponse
        {
            Body = cleaned,
            UsedMilo = true,
            UsedFallback = false,
        };
    }

    internal static bool IsMiloEligibleKind(string kind) =>
        kind is "senior_mobility_tip" or "vac_due_soon";

    internal static bool IsSafeCopy(string body) =>
        !string.IsNullOrWhiteSpace(body)
        && body.Length <= 140
        && !UnsafePattern.IsMatch(body);

    internal static string SanitizeCopy(string raw)
    {
        var oneLine = raw.Replace('\n', ' ').Replace('\r', ' ').Trim();
        oneLine = Regex.Replace(oneLine, @"\s+", " ");
        if (oneLine.Length > 140)
            oneLine = oneLine[..137].TrimEnd() + "…";
        return oneLine;
    }

    internal static string BuildTemplateBody(MiloNudgeCopyRequest request)
    {
        var pet = string.IsNullOrWhiteSpace(request.PetName) ? "your pet" : request.PetName.Trim();
        return request.Kind switch
        {
            "senior_mobility_tip" =>
                $"Recent notes for {pet} mention stiffness — gentle walks and soft surfaces may help. Confirm with your vet.",
            "vac_due_soon" when request.Facts.TryGetValue("vaccineName", out var vac) =>
                $"{vac} for {pet} is coming due — tap to review records and schedule with your vet.",
            "vac_due_soon" =>
                $"A vaccine for {pet} is coming due — tap to review records and schedule with your vet.",
            _ => $"Tap PawBuck to review care reminders for {pet}.",
        };
    }

    private static string BuildPrompt(MiloNudgeCopyRequest request)
    {
        var pet = request.PetName.Trim();
        var facts = request.Facts.Count == 0
            ? ""
            : string.Join("\n", request.Facts.Select(kv => $"- {kv.Key}: {kv.Value}"));

        if (request.Kind == "senior_mobility_tip")
        {
            var journal = request.JournalContext?.Trim() ?? "";
            if (journal.Length > 800)
                journal = journal[..800];

            return $"""
                You are Milo, PawBuck's caring pet wellness assistant. The pet parent journal (recent) mentions stiffness or being slow for senior pet "{pet}".
                Write ONE short sentence (max 140 characters) with a gentle, non-alarming wellness tip (e.g. shorter walk, softer surfaces). No diagnosis or medication advice. No emojis.

                Journal context (may be truncated):
                {journal}
                """;
        }

        return $"""
            You are Milo, PawBuck's caring pet wellness assistant. Write ONE warm reminder sentence (max 140 characters) that a vaccine is coming due for "{pet}".
            No diagnosis, no dosing, no invented dates. Encourage checking records and their veterinarian.

            Facts:
            {facts}
            """;
    }
}
