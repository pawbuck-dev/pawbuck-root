using System.Text.Json;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class MiloInteractionOutcomeRecorder : IMiloInteractionOutcomeRecorder
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly IOptions<SupabaseOptions> _options;
    private readonly IOptions<GeminiOptions> _geminiOptions;
    private readonly ILogger<MiloInteractionOutcomeRecorder> _logger;

    public MiloInteractionOutcomeRecorder(
        IOptions<SupabaseOptions> options,
        IOptions<GeminiOptions> geminiOptions,
        ILogger<MiloInteractionOutcomeRecorder> logger)
    {
        _options = options;
        _geminiOptions = geminiOptions;
        _logger = logger;
    }

    public async Task TryRecordChatAsync(
        Guid userId,
        MiloChatRequest request,
        MiloChatResponse response,
        string? unhandledException = null,
        CancellationToken cancellationToken = default)
    {
        var modelId = ResolveModelId();
        var insert = MiloInteractionOutcomeClassifier.ClassifyChat(
            userId, request, response, modelId, unhandledException);
        await TryInsertAsync(insert, cancellationToken);
    }

    public async Task TryRecordVisionAsync(
        Guid userId,
        Guid petId,
        Guid documentId,
        string documentType,
        double confidence,
        double classifyConfidence,
        string extractedJson,
        string? ingestionSource,
        CancellationToken cancellationToken = default)
    {
        var surface = MiloInteractionOutcomeClassifier.ResolveVisionSurface(ingestionSource);
        var insert = MiloInteractionOutcomeClassifier.ClassifyVision(
            userId,
            petId,
            documentId,
            surface,
            documentType,
            confidence,
            classifyConfidence,
            extractedJson,
            ResolveModelId(),
            ingestionSource);
        await TryInsertAsync(insert, cancellationToken);
    }

    private async Task TryInsertAsync(MiloInteractionOutcomeInsert row, CancellationToken cancellationToken)
    {
        try
        {
            var cs = _options.Value.ConnectionString;
            if (string.IsNullOrWhiteSpace(cs))
                return;

            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync(cancellationToken);

            const string sql = """
                INSERT INTO public.milo_interaction_outcomes (
                  user_id, pet_id, turn_id, document_id, surface, outcome, failure_code,
                  intent_tags, used_rag, used_curated, used_pet_facts, journal_emergency_stop,
                  document_type, confidence, model_id, metadata)
                VALUES (
                  @userId, @petId, @turnId, @documentId, @surface, @outcome, @failureCode,
                  @intentTags, @usedRag, @usedCurated, @usedPetFacts, @journalEmergencyStop,
                  @documentType, @confidence, @modelId, @metadata::jsonb)
                """;

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("userId", (object?)row.UserId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("petId", (object?)row.PetId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("turnId", (object?)row.TurnId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("documentId", (object?)row.DocumentId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("surface", row.Surface);
            cmd.Parameters.AddWithValue("outcome", row.Outcome);
            cmd.Parameters.AddWithValue("failureCode", (object?)row.FailureCode ?? DBNull.Value);
            cmd.Parameters.AddWithValue("intentTags", row.IntentTags.ToArray());
            cmd.Parameters.AddWithValue("usedRag", row.UsedRag);
            cmd.Parameters.AddWithValue("usedCurated", row.UsedCurated);
            cmd.Parameters.AddWithValue("usedPetFacts", row.UsedPetFacts);
            cmd.Parameters.AddWithValue("journalEmergencyStop", row.JournalEmergencyStop);
            cmd.Parameters.AddWithValue("documentType", (object?)row.DocumentType ?? DBNull.Value);
            cmd.Parameters.AddWithValue("confidence", row.Confidence.HasValue ? row.Confidence.Value : DBNull.Value);
            cmd.Parameters.AddWithValue("modelId", (object?)row.ModelId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("metadata", JsonSerializer.Serialize(row.Metadata ?? new Dictionary<string, object?>(), JsonOptions));

            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to record Milo interaction outcome surface={Surface}", row.Surface);
        }
    }

    private string ResolveModelId()
    {
        var model = _geminiOptions.Value.Model?.Trim();
        return string.IsNullOrWhiteSpace(model) ? GeminiOptions.DefaultModelId : model;
    }
}
