using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface IJournalTreeInterviewService
{
    Task<MiloChatResponse?> TryRunTurnAsync(
        MiloChatRequest request,
        Guid userId,
        Guid petId,
        MiloJournalConfigSnapshot config,
        CancellationToken cancellationToken = default);

    Task<bool> LinkSessionToJournalEntryAsync(
        Guid userId,
        Guid petId,
        Guid sessionId,
        Guid journalEntryId,
        CancellationToken cancellationToken = default);

    Task<JournalActiveSessionDto?> GetActiveSessionAsync(
        Guid userId,
        Guid petId,
        CancellationToken cancellationToken = default);
}

public sealed class JournalActiveSessionDto
{
    [JsonPropertyName("sessionId")]
    public Guid SessionId { get; init; }

    [JsonPropertyName("treeId")]
    public string TreeId { get; init; } = "";

    [JsonPropertyName("treeVersion")]
    public string TreeVersion { get; init; } = "";

    [JsonPropertyName("phase")]
    public string Phase { get; init; } = "";

    [JsonPropertyName("questionsAskedCount")]
    public int QuestionsAskedCount { get; init; }
}

public sealed class JournalTreeInterviewService : IJournalTreeInterviewService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly IOptions<SupabaseOptions> _options;
    private readonly IJournalTreeCatalog _catalog;
    private readonly IPetConversationalContextService _contextService;
    private readonly IMedicationAdrService _adrService;
    private readonly IJournalTreeGeminiHelper _geminiHelper;
    private readonly ILogger<JournalTreeInterviewService> _logger;

    public JournalTreeInterviewService(
        IOptions<SupabaseOptions> options,
        IJournalTreeCatalog catalog,
        IPetConversationalContextService contextService,
        IMedicationAdrService adrService,
        IJournalTreeGeminiHelper geminiHelper,
        ILogger<JournalTreeInterviewService> logger)
    {
        _options = options;
        _catalog = catalog;
        _contextService = contextService;
        _adrService = adrService;
        _geminiHelper = geminiHelper;
        _logger = logger;
    }

    public async Task<MiloChatResponse?> TryRunTurnAsync(
        MiloChatRequest request,
        Guid userId,
        Guid petId,
        MiloJournalConfigSnapshot config,
        CancellationToken cancellationToken = default)
    {
        if (!config.JournalTreeInterviewEnabled)
            return null;

        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return null;

        var petName = request.Pet?.Name?.Trim() ?? "your pet";
        JournalTreeDefinitionDto? tree = null;
        Guid sessionId;

        if (Guid.TryParse(request.JournalSessionId, out var existingId))
        {
            var session = await LoadSessionAsync(cs, existingId, userId, petId, cancellationToken);
            if (session == null)
                return null;
            sessionId = session.Id;
            tree = _catalog.TryGet(session.TreeId);
            if (tree == null)
                return null;

            return await AdvanceSessionAsync(
                cs, session, tree, request, petName, userId, petId, config, cancellationToken);
        }

        var treeId = request.JournalTreeId?.Trim();
        if (string.IsNullOrEmpty(treeId))
        {
            var resolved = _catalog.ResolveByTopic(request.Message);
            treeId = resolved?.TreeId;
        }

        if (string.IsNullOrEmpty(treeId))
        {
            var route = await _geminiHelper.RouteTopicAsync(
                request.Message,
                _catalog.GetAll().Select(t => t.TreeId).ToList(),
                cancellationToken);
            if (route is { Confidence: >= 0.55 } r)
                treeId = r.TreeId;
        }

        if (string.IsNullOrEmpty(treeId) && LooksLikeMedicalAdviceRequest(request.Message))
        {
            return new MiloChatResponse
            {
                Answer =
                    "I can't diagnose or recommend treatments. I can help you log what you're seeing so your veterinarian can advise you. What symptom should we note?",
                SuggestedReplies = ["Vomiting or diarrhea", "Lethargic today", "Changed appetite", "Not sure"],
                JournalStatus = "CONTINUE",
                UsedPetData = true,
            };
        }

        tree = string.IsNullOrEmpty(treeId) ? null : _catalog.TryGet(treeId);
        if (tree == null)
            return null;

        var wrongPet = await DetectWrongPetMentionAsync(cs, userId, petId, petName, request.Message, cancellationToken);
        if (wrongPet != null)
        {
            return new MiloChatResponse
            {
                Answer = wrongPet,
                SuggestedReplies = ["Continue with this pet", "Switch pet in journal"],
                JournalStatus = "CONTINUE",
                UsedPetData = true,
            };
        }

        sessionId = await CreateSessionAsync(cs, userId, petId, tree, cancellationToken);
        var newSession = await LoadSessionAsync(cs, sessionId, userId, petId, cancellationToken);
        if (newSession == null)
            return null;

        return await BuildContextSurfaceResponseAsync(
            cs, newSession, tree, petName, userId, petId, config, cancellationToken);
    }

    private async Task<MiloChatResponse> AdvanceSessionAsync(
        string cs,
        SessionRow session,
        JournalTreeDefinitionDto tree,
        MiloChatRequest request,
        string petName,
        Guid userId,
        Guid petId,
        MiloJournalConfigSnapshot config,
        CancellationToken cancellationToken)
    {
        var action = (request.JournalAction ?? "answer").Trim().ToLowerInvariant();
        var answers = ParseAnswers(session.AnswersJson);

        if (session.Phase == JournalInterviewPhases.ContextSurface)
        {
            if (action is "add_medication")
            {
                return await BuildContextSurfaceRecordLinkResponseAsync(
                    cs, session, tree, petName, userId, petId, config, "medication", cancellationToken);
            }

            if (action is "add_vaccines" or "add_vaccination" or "update_vaccines")
            {
                return await BuildContextSurfaceRecordLinkResponseAsync(
                    cs, session, tree, petName, userId, petId, config, "vaccination", cancellationToken);
            }

            if (action is "context_continue")
            {
                await UpdateSessionPhaseAsync(
                    cs, session.Id, JournalInterviewPhases.Question, GetFirstQuestionId(tree), cancellationToken);
                session = await LoadSessionAsync(cs, session.Id, userId, petId, cancellationToken) ?? session;
                var first = tree.Questions.OrderBy(q => q.Step).FirstOrDefault();
                if (first != null)
                {
                    return BuildQuestionResponse(session, tree, first, petName, session.EmergencyDetected);
                }
            }

            return await BuildContextSurfaceResponseAsync(
                cs, session, tree, petName, userId, petId, config, cancellationToken);
        }

        if (session.Phase == JournalInterviewPhases.Question && !string.IsNullOrEmpty(session.CurrentQuestionId))
        {
            var q = tree.Questions.FirstOrDefault(x => x.Id == session.CurrentQuestionId);
            if (q != null)
            {
                StoreAnswer(answers, q.Id, request.Message, request.JournalChipIds);
                var asked = session.QuestionsAskedCount + 1;
                var emergency = JournalTreeRedFlagEvaluator.EvaluateEmergency(tree, answers);
                var nextId = GetNextQuestionId(tree, q, answers, asked, emergency);

                if (nextId == null || asked >= tree.MaxQuestions)
                {
                    var summary = BuildStructuredSummary(tree, answers, petName);
                    await SaveSessionProgressAsync(
                        cs, session.Id, JournalInterviewPhases.SummaryDraft, null, asked, answers, summary, emergency, cancellationToken);
                    return BuildSummaryDraftResponse(session, tree, summary, emergency, petName);
                }

                await SaveSessionProgressAsync(
                    cs, session.Id, JournalInterviewPhases.Question, nextId, asked, answers, null, emergency, cancellationToken);
                return BuildQuestionResponse(session, tree, tree.Questions.First(x => x.Id == nextId)!, petName, emergency);
            }
        }

        if (session.Phase == JournalInterviewPhases.SummaryDraft)
        {
            if (action is "edit_summary" && request.JournalSummaryFields is { Count: > 0 })
            {
                var edited = session.DraftSummaryJson != null
                    ? JsonSerializer.Deserialize<JournalStructuredSummaryDto>(session.DraftSummaryJson, JsonOptions)
                    : BuildStructuredSummary(tree, answers, petName);
                edited ??= BuildStructuredSummary(tree, answers, petName);
                var merged = new Dictionary<string, string>(edited.Fields, StringComparer.OrdinalIgnoreCase);
                foreach (var kv in request.JournalSummaryFields)
                    merged[kv.Key] = kv.Value;
                var updated = new JournalStructuredSummaryDto
                {
                    Fields = merged,
                    RedFlags = edited.RedFlags,
                    AttachmentHint = edited.AttachmentHint,
                    ConfidenceScore = edited.ConfidenceScore,
                    LowConfidence = edited.LowConfidence,
                };
                await SaveSessionProgressAsync(
                    cs, session.Id, JournalInterviewPhases.SummaryDraft, null, session.QuestionsAskedCount,
                    answers, updated, session.EmergencyDetected, cancellationToken);
                return BuildSummaryDraftResponse(session, tree, updated, session.EmergencyDetected, petName);
            }

            if (action is "confirm_summary")
            {
                var summary = session.DraftSummaryJson != null
                    ? JsonSerializer.Deserialize<JournalStructuredSummaryDto>(session.DraftSummaryJson, JsonOptions)
                    : BuildStructuredSummary(tree, answers, petName);
                var plainSummary = FormatPlainSummary(summary ?? new JournalStructuredSummaryDto());
                var polished = await _geminiHelper.PolishSummaryAsync(plainSummary, petName, cancellationToken);
                if (!string.IsNullOrWhiteSpace(polished))
                    plainSummary = JournalTreeSummaryBuilder.StripUnspecifiedFieldLines(polished.Trim());
                else
                    plainSummary = JournalTreeSummaryBuilder.StripUnspecifiedFieldLines(plainSummary);
                await CompleteSessionAsync(cs, session.Id, cancellationToken);

                return new MiloChatResponse
                {
                    Answer = $"Saved to {petName}'s journal.",
                    JournalSessionComplete = true,
                    JournalStatus = "COMPLETE",
                    JournalSummary = plainSummary,
                    StructuredSummary = summary,
                    InterviewPhase = JournalInterviewPhases.Complete,
                    TreeId = tree.TreeId,
                    TreeVersion = tree.Version,
                    JournalSessionId = session.Id.ToString(),
                    EmergencyDetected = session.EmergencyDetected,
                    ConfidenceScore = summary?.ConfidenceScore,
                    SuggestedReplies = Array.Empty<string>(),
                    PromptVersion = config.PromptVersion,
                };
            }

            var draftSummary = session.DraftSummaryJson != null
                ? JsonSerializer.Deserialize<JournalStructuredSummaryDto>(session.DraftSummaryJson, JsonOptions)
                : BuildStructuredSummary(tree, answers, petName);
            draftSummary ??= BuildStructuredSummary(tree, answers, petName);
            if (IsEditSummaryIntent(request.Message) || action is "edit_summary")
            {
                var editResponse = BuildSummaryDraftResponse(
                    session, tree, draftSummary, session.EmergencyDetected, petName);
                editResponse.Answer =
                    $"Use Edit on the summary to change fields for {petName}, then save when it looks right.";
                return editResponse;
            }

            return BuildSummaryDraftResponse(session, tree, draftSummary, session.EmergencyDetected, petName);
        }

        return BuildQuestionResponse(
            session,
            tree,
            tree.Questions.FirstOrDefault(q => q.Id == session.CurrentQuestionId) ?? tree.Questions[0],
            petName,
            session.EmergencyDetected);
    }

    private async Task<MiloChatResponse> BuildContextSurfaceResponseAsync(
        string cs,
        SessionRow session,
        JournalTreeDefinitionDto tree,
        string petName,
        Guid userId,
        Guid petId,
        MiloJournalConfigSnapshot config,
        CancellationToken cancellationToken)
    {
        var ctx = await _contextService.GetPetConversationalContextAsync(userId, petId, config, cancellationToken)
                  ?? new PetConversationalContextDto();
        var lines = new List<JournalContextSurfaceLineDto>();
        var sparse = ctx.VaccinationsOnFileCount == 0 && ctx.MedicationsOnFileCount == 0;

        if (ctx.VaccinationsOnFileCount > 0)
            lines.Add(new() { Kind = "ok", Text = "Vaccines current on file" });
        else
            lines.Add(new() { Kind = "gap", Text = "No vaccines on file yet" });

        if (ctx.MedicationsOnFileCount > 0)
            lines.Add(new() { Kind = "ok", Text = "Current medications on file" });
        else
            lines.Add(new() { Kind = "gap", Text = "No current medications on file" });

        lines.Add(new() { Kind = "ok", Text = "Checking prior journal notes for similar episodes" });

        string? adrWarning = null;
        var adrKeys = tree.ContextSurface.AdrSymptomKeys ?? tree.SymptomTaxonomy;
        var adrMatches = await _adrService.MatchForPetAsync(petId, adrKeys, cancellationToken);
        if (adrMatches.Count > 0)
        {
            var top = adrMatches[0];
            adrWarning =
                $"One flag: {top.LabelText} Don't change {petName}'s medication without checking with your vet — but it's worth mentioning.";
            lines.Add(new() { Kind = "warn", Text = $"On {top.GenericName}" });
        }

        string? puppyWarning = null;
        if (tree.ContextSurface.PuppyGiWarning &&
            ctx.PetProfile.AgeYears is < 1)
        {
            puppyWarning =
                $"{petName} is under a year old — GI symptoms in puppies can worsen quickly. When in doubt, contact your vet today.";
            lines.Add(new() { Kind = "warn", Text = "Puppy — GI symptoms need closer attention" });
        }

        string? brachyWarning = null;
        if (IsBrachycephalicBreed(ctx.PetProfile.Breed) &&
            tree.TreeId.Contains("cough", StringComparison.OrdinalIgnoreCase))
        {
            brachyWarning =
                $"Brachycephalic breeds like {petName} can have breathing emergencies — seek urgent care if breathing is labored.";
            lines.Add(new() { Kind = "warn", Text = "Brachycephalic breed on file" });
        }

        var confidence = sparse ? 0.75m : 0.92m;
        var surface = new JournalContextSurfaceDto
        {
            Lines = lines,
            Actions =
            [
                new() { Id = "context_continue", Label = "Looks right — continue" },
                new() { Id = "add_medication", Label = "Add a medication" },
                new() { Id = "add_vaccines", Label = "Update vaccines" },
            ],
            AdrWarning = adrWarning,
            Confidence = confidence,
            SparseRecord = sparse,
            PuppyGiWarning = puppyWarning,
            BrachyWarning = brachyWarning,
        };

        var intro = sparse
            ? $"I don't have much on {petName}'s record yet — let's start fresh. After we're done, I'll suggest a few things you might want to add."
            : $"Before we start, quick context I have on {petName}:";

        return new MiloChatResponse
        {
            Answer = intro,
            ContextSurface = surface,
            InterviewPhase = JournalInterviewPhases.ContextSurface,
            TreeId = tree.TreeId,
            TreeVersion = tree.Version,
            JournalSessionId = session.Id.ToString(),
            QuestionsAskedCount = 0,
            ConfidenceScore = confidence,
            SuggestedReplies = Array.Empty<string>(),
            JournalStatus = "CONTINUE",
            PromptVersion = config.PromptVersion,
            UsedPetData = true,
        };
    }

    private async Task<MiloChatResponse> BuildContextSurfaceRecordLinkResponseAsync(
        string cs,
        SessionRow session,
        JournalTreeDefinitionDto tree,
        string petName,
        Guid userId,
        Guid petId,
        MiloJournalConfigSnapshot config,
        string deepLinkKind,
        CancellationToken cancellationToken)
    {
        var surfaceResponse = await BuildContextSurfaceResponseAsync(
            cs, session, tree, petName, userId, petId, config, cancellationToken);

        surfaceResponse.JournalHealthDeepLink = deepLinkKind;
        surfaceResponse.Answer = deepLinkKind == "vaccination"
            ? $"To update {petName}'s vaccines, open Health Records — I've opened that flow for you. When you're ready, come back and tap Looks right — continue to log today's symptoms."
            : $"To add a medication for {petName}, open Health Records — I've opened that flow for you. When you're ready, come back and tap Looks right — continue here.";
        return surfaceResponse;
    }

    private static MiloChatResponse BuildQuestionResponse(
        SessionRow session,
        JournalTreeDefinitionDto tree,
        JournalTreeQuestionDto question,
        string petName,
        bool emergency)
    {
        var prompt = question.Prompt.Replace("{petName}", petName, StringComparison.Ordinal);
        var chips = question.Type switch
        {
            "two_stage" => (question.Stage1Options ?? []).Select(c => c.Label).ToList(),
            "freeform" => new List<string> { "Skip", "+ Add details" },
            _ => (question.Options ?? []).Select(c => c.Label).ToList(),
        };
        if (!chips.Contains("Not sure", StringComparer.OrdinalIgnoreCase))
            chips.Add("Not sure");
        if (!chips.Contains("+ Add details", StringComparer.OrdinalIgnoreCase))
            chips.Add("+ Add details");

        return new MiloChatResponse
        {
            Answer = prompt,
            SuggestedReplies = chips,
            CurrentQuestion = ToCurrentQuestion(question, petName),
            InterviewPhase = JournalInterviewPhases.Question,
            TreeId = tree.TreeId,
            TreeVersion = tree.Version,
            JournalSessionId = session.Id.ToString(),
            QuestionsAskedCount = session.QuestionsAskedCount,
            EmergencyDetected = emergency,
            JournalStatus = "CONTINUE",
            UsedPetData = true,
        };
    }

    private static JournalCurrentQuestionDto ToCurrentQuestion(JournalTreeQuestionDto question, string petName)
    {
        var prompt = question.Prompt.Replace("{petName}", petName, StringComparison.Ordinal);
        return new JournalCurrentQuestionDto
        {
            Id = question.Id,
            Type = question.Type,
            Prompt = prompt,
            Options = question.Options ?? new List<JournalTreeChipOptionDto>(),
            Stage1Options = question.Stage1Options,
            Stage2Options = question.Stage2Options,
            AllowMulti = string.Equals(question.Type, "multi", StringComparison.OrdinalIgnoreCase),
        };
    }

    public async Task<bool> LinkSessionToJournalEntryAsync(
        Guid userId,
        Guid petId,
        Guid sessionId,
        Guid journalEntryId,
        CancellationToken cancellationToken = default)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return false;

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            UPDATE public.journal_interview_sessions s
            SET journal_entry_id = @entryId, updated_at = timezone('utc', now())
            WHERE s.id = @sessionId AND s.user_id = @userId AND s.pet_id = @petId
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("entryId", journalEntryId);
        cmd.Parameters.AddWithValue("sessionId", sessionId);
        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("petId", petId);
        return await cmd.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    public async Task<JournalActiveSessionDto?> GetActiveSessionAsync(
        Guid userId,
        Guid petId,
        CancellationToken cancellationToken = default)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return null;

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            SELECT id, tree_id, tree_version, phase, questions_asked_count
            FROM public.journal_interview_sessions
            WHERE user_id = @userId AND pet_id = @petId
              AND phase NOT IN ('complete', 'abandoned')
              AND expires_at > timezone('utc', now())
            ORDER BY updated_at DESC
            LIMIT 1
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("petId", petId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return new JournalActiveSessionDto
        {
            SessionId = reader.GetGuid(0),
            TreeId = reader.GetString(1),
            TreeVersion = reader.GetString(2),
            Phase = reader.GetString(3),
            QuestionsAskedCount = reader.GetInt32(4),
        };
    }

    private static bool IsEditSummaryIntent(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return false;
        var t = message.Trim().ToLowerInvariant();
        return t is "edit a field" or "edit summary" || t.StartsWith("edit ", StringComparison.Ordinal);
    }

    private static MiloChatResponse BuildSummaryDraftResponse(
        SessionRow session,
        JournalTreeDefinitionDto tree,
        JournalStructuredSummaryDto summary,
        bool emergency,
        string petName)
    {
        return new MiloChatResponse
        {
            Answer = $"Here's the draft for {petName}. Tap any field to edit, then save.",
            StructuredSummary = summary,
            InterviewPhase = JournalInterviewPhases.SummaryDraft,
            TreeId = tree.TreeId,
            TreeVersion = tree.Version,
            JournalSessionId = session.Id.ToString(),
            EmergencyDetected = emergency,
            ConfidenceScore = summary.ConfidenceScore,
            SuggestedReplies = ["Looks right — save", "Edit a field", "Start over"],
            JournalStatus = "CONTINUE",
            UsedPetData = true,
        };
    }

    private static string? GetFirstQuestionId(JournalTreeDefinitionDto tree) =>
        tree.Questions.OrderBy(q => q.Step).FirstOrDefault()?.Id;

    private static string? GetNextQuestionId(
        JournalTreeDefinitionDto tree,
        JournalTreeQuestionDto current,
        Dictionary<string, JsonElement> answers,
        int askedCount,
        bool emergency)
    {
        var ordered = tree.Questions.OrderBy(q => q.Step).ToList();
        var idx = ordered.FindIndex(q => q.Id == current.Id);
        for (var i = idx + 1; i < ordered.Count; i++)
        {
            var q = ordered[i];
            if (q.Step == 6 && !JournalTreeRedFlagEvaluator.ShouldAskRedFlagScreen(tree, answers, emergency))
                continue;
            if (!JournalTreeConditionals.PassesConditional(q.ConditionalOn, answers))
                continue;
            return q.Id;
        }

        return null;
    }

    private static JournalStructuredSummaryDto BuildStructuredSummary(
        JournalTreeDefinitionDto tree,
        Dictionary<string, JsonElement> answers,
        string petName)
    {
        var fields = JournalTreeSummaryBuilder.BuildFields(tree, answers, petName);

        var redFlags = new List<string>();
        if (JournalTreeRedFlagEvaluator.EvaluateEmergency(tree, answers))
            redFlags.Add("Possible urgent signs reported");

        return new JournalStructuredSummaryDto
        {
            Fields = fields,
            RedFlags = redFlags,
            AttachmentHint = tree.TreeId.Contains("itch", StringComparison.OrdinalIgnoreCase) ||
                            tree.TreeId.Contains("eye", StringComparison.OrdinalIgnoreCase),
            ConfidenceScore = 0.9m,
            LowConfidence = false,
        };
    }

    private static bool IsBrachycephalicBreed(string? breed)
    {
        if (string.IsNullOrWhiteSpace(breed))
            return false;
        var b = breed.ToLowerInvariant();
        return b.Contains("bulldog", StringComparison.Ordinal) ||
               b.Contains("pug", StringComparison.Ordinal) ||
               b.Contains("brachy", StringComparison.Ordinal) ||
               b.Contains("frenchie", StringComparison.Ordinal) ||
               b.Contains("boston terrier", StringComparison.Ordinal) ||
               b.Contains("pekingese", StringComparison.Ordinal) ||
               b.Contains("shih tzu", StringComparison.Ordinal);
    }

    private static async Task<string?> DetectWrongPetMentionAsync(
        string cs,
        Guid userId,
        Guid petId,
        string currentPetName,
        string message,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(message))
            return null;

        var otherNames = new List<string>();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            SELECT name FROM public.pets
            WHERE user_id = @userId AND id <> @petId AND coalesce(name, '') <> ''
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("petId", petId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var name = reader.GetString(0).Trim();
            if (name.Length >= 2)
                otherNames.Add(name);
        }

        if (otherNames.Count == 0)
            return null;

        var msg = message.ToLowerInvariant();
        foreach (var name in otherNames.OrderByDescending(n => n.Length))
        {
            if (name.Equals(currentPetName, StringComparison.OrdinalIgnoreCase))
                continue;
            if (ContainsWholeWord(msg, name.ToLowerInvariant()))
            {
                return
                    $"This note is for {currentPetName}, but you mentioned {name}. " +
                    $"If you meant {name}, switch pets in the journal first — or continue if you meant {currentPetName}.";
            }
        }

        return null;
    }

    private static bool ContainsWholeWord(string haystack, string word)
    {
        if (string.IsNullOrEmpty(word))
            return false;
        var pattern = $@"\b{Regex.Escape(word)}\b";
        return Regex.IsMatch(haystack, pattern, RegexOptions.IgnoreCase);
    }

    private static void StoreAnswer(
        Dictionary<string, JsonElement> answers,
        string questionId,
        string message,
        IReadOnlyList<string>? chipIds)
    {
        var chips = chipIds?.ToList() ?? new List<string>();
        if (chips.Count == 0 && !string.IsNullOrWhiteSpace(message))
            chips.Add(message.Trim());

        var obj = JsonSerializer.SerializeToElement(new { text = message, chips });
        answers[questionId] = obj;
    }

    private static Dictionary<string, JsonElement> ParseAnswers(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json, JsonOptions)
                   ?? new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);
        }
        catch
        {
            return new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);
        }
    }

    private static string FormatPlainSummary(JournalStructuredSummaryDto summary) =>
        JournalTreeSummaryBuilder.FormatPlainSummary(summary.Fields);

    private async Task<Guid> CreateSessionAsync(
        string cs,
        Guid userId,
        Guid petId,
        JournalTreeDefinitionDto tree,
        CancellationToken cancellationToken)
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            INSERT INTO public.journal_interview_sessions
              (user_id, pet_id, tree_id, tree_version, phase, answers)
            VALUES
              (@userId, @petId, @treeId, @version, @phase, '{}'::jsonb)
            RETURNING id
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("petId", petId);
        cmd.Parameters.AddWithValue("treeId", tree.TreeId);
        cmd.Parameters.AddWithValue("version", tree.Version);
        cmd.Parameters.AddWithValue("phase", JournalInterviewPhases.ContextSurface);
        return (Guid)(await cmd.ExecuteScalarAsync(cancellationToken))!;
    }

    private async Task<SessionRow?> LoadSessionAsync(
        string cs,
        Guid sessionId,
        Guid userId,
        Guid petId,
        CancellationToken cancellationToken)
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            SELECT id, tree_id, tree_version, phase, current_question_id, questions_asked_count,
                   answers::text, draft_summary::text, emergency_detected
            FROM public.journal_interview_sessions
            WHERE id = @id AND user_id = @userId AND pet_id = @petId
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("id", sessionId);
        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("petId", petId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return new SessionRow
        {
            Id = reader.GetGuid(0),
            TreeId = reader.GetString(1),
            TreeVersion = reader.GetString(2),
            Phase = reader.GetString(3),
            CurrentQuestionId = reader.IsDBNull(4) ? null : reader.GetString(4),
            QuestionsAskedCount = reader.GetInt32(5),
            AnswersJson = reader.IsDBNull(6) ? "{}" : reader.GetString(6),
            DraftSummaryJson = reader.IsDBNull(7) ? null : reader.GetString(7),
            EmergencyDetected = reader.GetBoolean(8),
        };
    }

    private static async Task UpdateSessionPhaseAsync(
        string cs,
        Guid sessionId,
        string phase,
        string? questionId,
        CancellationToken cancellationToken)
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            UPDATE public.journal_interview_sessions
            SET phase = @phase, current_question_id = @qid, updated_at = now()
            WHERE id = @id
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("id", sessionId);
        cmd.Parameters.AddWithValue("phase", phase);
        cmd.Parameters.AddWithValue("qid", (object?)questionId ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task SaveSessionProgressAsync(
        string cs,
        Guid sessionId,
        string phase,
        string? questionId,
        int questionsAsked,
        Dictionary<string, JsonElement> answers,
        JournalStructuredSummaryDto? draftSummary,
        bool emergency,
        CancellationToken cancellationToken)
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        var answersJson = JsonSerializer.Serialize(answers, JsonOptions);
        var draftJson = draftSummary != null ? JsonSerializer.Serialize(draftSummary, JsonOptions) : null;
        const string sql = """
            UPDATE public.journal_interview_sessions
            SET phase = @phase,
                current_question_id = @qid,
                questions_asked_count = @asked,
                answers = @answers::jsonb,
                draft_summary = @draft::jsonb,
                emergency_detected = @emergency,
                updated_at = now()
            WHERE id = @id
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("id", sessionId);
        cmd.Parameters.AddWithValue("phase", phase);
        cmd.Parameters.AddWithValue("qid", (object?)questionId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("asked", questionsAsked);
        cmd.Parameters.AddWithValue("answers", answersJson);
        cmd.Parameters.AddWithValue("draft", (object?)draftJson ?? DBNull.Value);
        cmd.Parameters.AddWithValue("emergency", emergency);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task CompleteSessionAsync(string cs, Guid sessionId, CancellationToken cancellationToken)
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            UPDATE public.journal_interview_sessions
            SET phase = @phase, updated_at = now()
            WHERE id = @id
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("id", sessionId);
        cmd.Parameters.AddWithValue("phase", JournalInterviewPhases.Complete);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static bool LooksLikeMedicalAdviceRequest(string message)
    {
        var t = (message ?? "").ToLowerInvariant();
        if (t.Length < 8)
            return false;
        return t.Contains("should i give", StringComparison.Ordinal)
               || t.Contains("what dose", StringComparison.Ordinal)
               || t.Contains("can i use", StringComparison.Ordinal)
               || t.Contains("diagnos", StringComparison.Ordinal)
               || t.Contains("prescri", StringComparison.Ordinal);
    }

    private sealed class SessionRow
    {
        public Guid Id { get; set; }
        public string TreeId { get; set; } = "";
        public string TreeVersion { get; set; } = "";
        public string Phase { get; set; } = "";
        public string? CurrentQuestionId { get; set; }
        public int QuestionsAskedCount { get; set; }
        public string AnswersJson { get; set; } = "{}";
        public string? DraftSummaryJson { get; set; }
        public bool EmergencyDetected { get; set; }
    }
}
