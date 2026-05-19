namespace PawBuck.API.Services;

public interface IMiloJournalTurnService
{
    /// <summary>Records an assistant turn (journal or general); returns id for client feedback.</summary>
    /// <param name="chatKind"><c>journal</c> or <c>general</c>.</param>
    Task<Guid> RegisterTurnAsync(
        Guid userId,
        Guid? petId,
        string promptVersion,
        IReadOnlyList<string> heuristicTags,
        string chatKind,
        CancellationToken cancellationToken = default);

    Task<bool> TrySubmitFeedbackAsync(
        Guid userId,
        Guid turnId,
        string rating,
        string? feedbackReason = null,
        string? treeVersion = null,
        int? questionsAsked = null,
        string? feedbackStage = null,
        CancellationToken cancellationToken = default);
}
