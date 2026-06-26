using System.Text.Json;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public static class MiloInteractionOutcomeClassifier
{
    private const double VisionLowConfidenceThreshold = 50.0;
    private const double ClassifyLowConfidenceThreshold = 60.0;

    public static MiloInteractionOutcomeInsert ClassifyChat(
        Guid userId,
        MiloChatRequest request,
        MiloChatResponse response,
        string? modelId,
        string? unhandledException = null)
    {
        Guid? petId = null;
        if (!string.IsNullOrWhiteSpace(request.Pet?.Id) && Guid.TryParse(request.Pet.Id, out var pid))
            petId = pid;

        Guid? turnId = response.ResponseId ?? (Guid.TryParse(response.TurnId ?? "", out var tid) ? tid : null);

        var surface = request.JournalMode ? MiloInteractionSurfaces.Journal : MiloInteractionSurfaces.Chat;
        var intentTags = BuildChatIntentTags(request, response);

        if (!string.IsNullOrWhiteSpace(unhandledException))
        {
            return BuildChatInsert(userId, petId, turnId, surface, MiloInteractionOutcomes.Failed,
                MiloInteractionFailureCodes.UnhandledException, intentTags, response, modelId,
                new Dictionary<string, object?> { ["exception"] = unhandledException });
        }

        var answer = (response.Answer ?? "").Trim();
        if (answer.Contains("can't access health data", StringComparison.OrdinalIgnoreCase)
            || answer.Contains("Please select a pet", StringComparison.OrdinalIgnoreCase))
        {
            return BuildChatInsert(userId, petId, turnId, surface, MiloInteractionOutcomes.Failed,
                MiloInteractionFailureCodes.AccessDenied, intentTags, response, modelId, null);
        }

        if (answer.Contains("not configured", StringComparison.OrdinalIgnoreCase))
        {
            return BuildChatInsert(userId, petId, turnId, surface, MiloInteractionOutcomes.Failed,
                MiloInteractionFailureCodes.ApiNotConfigured, intentTags, response, modelId, null);
        }

        if (response.JournalEmergencyStop == true)
        {
            return BuildChatInsert(userId, petId, turnId, surface, MiloInteractionOutcomes.Partial,
                MiloInteractionFailureCodes.JournalEmergencyStop, intentTags, response, modelId, null);
        }

        if (string.IsNullOrWhiteSpace(answer)
            || answer.Contains("couldn't come up with a response", StringComparison.OrdinalIgnoreCase)
            || answer.Contains("having trouble", StringComparison.OrdinalIgnoreCase))
        {
            return BuildChatInsert(userId, petId, turnId, surface, MiloInteractionOutcomes.Failed,
                MiloInteractionFailureCodes.EmptyAnswer, intentTags, response, modelId, null);
        }

        return BuildChatInsert(userId, petId, turnId, surface, MiloInteractionOutcomes.Success,
            failureCode: null, intentTags, response, modelId, null);
    }

    public static MiloInteractionOutcomeInsert ClassifyVision(
        Guid userId,
        Guid petId,
        Guid documentId,
        string surface,
        string documentType,
        double confidence,
        double classifyConfidence,
        string extractedJson,
        string? modelId,
        string? ingestionSource)
    {
        string outcome = MiloInteractionOutcomes.Success;
        string? failureCode = null;

        if (string.Equals(documentType, "irrelevant", StringComparison.OrdinalIgnoreCase))
        {
            outcome = MiloInteractionOutcomes.Failed;
            failureCode = MiloInteractionFailureCodes.VisionWrongType;
        }
        else if (classifyConfidence < ClassifyLowConfidenceThreshold)
        {
            outcome = MiloInteractionOutcomes.Partial;
            failureCode = MiloInteractionFailureCodes.VisionClassifyLowConfidence;
        }
        else if (confidence < VisionLowConfidenceThreshold)
        {
            outcome = MiloInteractionOutcomes.Partial;
            failureCode = MiloInteractionFailureCodes.VisionLowConfidence;
        }

        if (IsClinicalDocumentType(documentType) && !HasNonEmptyItems(extractedJson))
        {
            outcome = MiloInteractionOutcomes.Failed;
            failureCode = MiloInteractionFailureCodes.VisionEmptyItems;
        }

        var tags = new List<string> { documentType };
        if (!string.IsNullOrWhiteSpace(ingestionSource))
            tags.Add($"source:{ingestionSource.Trim().ToLowerInvariant()}");

        return new MiloInteractionOutcomeInsert
        {
            UserId = userId,
            PetId = petId,
            DocumentId = documentId,
            Surface = surface,
            Outcome = outcome,
            FailureCode = failureCode,
            IntentTags = tags,
            DocumentType = documentType,
            Confidence = confidence,
            ModelId = modelId,
            Metadata = new Dictionary<string, object?>
            {
                ["classifyConfidence"] = classifyConfidence,
                ["ingestionSource"] = ingestionSource,
            },
        };
    }

    public static string ResolveVisionSurface(string? ingestionSource)
    {
        if (string.IsNullOrWhiteSpace(ingestionSource))
            return MiloInteractionSurfaces.Vision;
        return ingestionSource.Contains("email", StringComparison.OrdinalIgnoreCase)
            ? MiloInteractionSurfaces.EmailVault
            : MiloInteractionSurfaces.Vision;
    }

    private static MiloInteractionOutcomeInsert BuildChatInsert(
        Guid userId,
        Guid? petId,
        Guid? turnId,
        string surface,
        string outcome,
        string? failureCode,
        IReadOnlyList<string> intentTags,
        MiloChatResponse response,
        string? modelId,
        IReadOnlyDictionary<string, object?>? metadata) =>
        new()
        {
            UserId = userId,
            PetId = petId,
            TurnId = turnId,
            Surface = surface,
            Outcome = outcome,
            FailureCode = failureCode,
            IntentTags = intentTags,
            UsedRag = response.UsedRag == true,
            UsedCurated = response.UsedCurated == true,
            UsedPetFacts = response.UsedPetData == true,
            JournalEmergencyStop = response.JournalEmergencyStop == true,
            ModelId = modelId,
            Metadata = metadata,
        };

    private static List<string> BuildChatIntentTags(MiloChatRequest request, MiloChatResponse response)
    {
        var tags = new List<string>();
        if (request.JournalMode)
            tags.Add("journal");
        else
            tags.Add("general_chat");

        var topic = MiloCuratedTopicHeuristic.InferTopic(request.Message ?? "");
        if (!string.IsNullOrWhiteSpace(topic))
            tags.Add($"topic:{topic}");

        if (response.UsedRag == true)
            tags.Add("rag");
        if (response.UsedCurated == true)
            tags.Add("curated");
        if (response.UsedPetData == true)
            tags.Add("pet_facts");
        if (response.JournalSessionComplete == true)
            tags.Add("journal_complete");

        return tags;
    }

    private static bool IsClinicalDocumentType(string documentType) =>
        documentType is "vaccinations" or "medications" or "lab_results" or "clinical_exams" or "travel_certificate";

    private static bool HasNonEmptyItems(string extractedJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(extractedJson);
            if (doc.RootElement.TryGetProperty("items", out var items)
                && items.ValueKind == JsonValueKind.Array
                && items.GetArrayLength() > 0)
                return true;
        }
        catch (JsonException)
        {
            /* ignore */
        }

        return false;
    }
}
