using PawBuck.API.Models;

namespace PawBuck.API.Services;

public interface IMiloInteractionOutcomeRecorder
{
    Task TryRecordChatAsync(
        Guid userId,
        MiloChatRequest request,
        MiloChatResponse response,
        string? unhandledException = null,
        CancellationToken cancellationToken = default);

    Task TryRecordVisionAsync(
        Guid userId,
        Guid petId,
        Guid documentId,
        string documentType,
        double confidence,
        double classifyConfidence,
        string extractedJson,
        string? ingestionSource,
        CancellationToken cancellationToken = default);
}
