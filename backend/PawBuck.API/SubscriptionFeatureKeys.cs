namespace PawBuck.API;

/// <summary>
/// Canonical <c>subscription_feature_gates.feature_key</c> values (Postgres + mobile + admin PATCH).
/// </summary>
public static class SubscriptionFeatureKeys
{
    public const string MiloChat = "milo_chat";
    public const string PetJournal = "pet_journal";
    public const string HealthBriefing = "health_briefing";
    public const string WeeklyChallenge = "weekly_challenge";
    public const string BookVet = "book_vet";
    public const string FamilySharing = "family_sharing";
    public const string PetTransfer = "pet_transfer";
}
