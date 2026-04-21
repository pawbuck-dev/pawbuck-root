namespace PawBuck.API.Services;

public interface IMiloJournalTurnService
{
    /// <summary>Records a journal assistant turn; returns id for client feedback.</summary>
    Task<Guid> RegisterTurnAsync(
        Guid userId,
        Guid petId,
        string promptVersion,
        IReadOnlyList<string> heuristicTags,
        CancellationToken cancellationToken = default);

    Task<bool> TrySubmitFeedbackAsync(
        Guid userId,
        Guid turnId,
        string rating,
        CancellationToken cancellationToken = default);
}
