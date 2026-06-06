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
    public const string DocumentUpload = "document_upload";
    public const string AiJournalEntry = "ai_journal_entry";
    public const string MiloSymptomTrees = "milo_symptom_trees";
    public const string EmailParsing = "email_parsing";
    public const string PetPassportExport = "pet_passport_export";
    public const string HealthAlerts = "health_alerts";
    public const string MultiPet = "multi_pet";
    public const string MultiPetDashboard = "multi_pet_dashboard";
    public const string FamilyPermissions = "family_permissions";
    public const string PerPetEmail = "per_pet_email";
}
