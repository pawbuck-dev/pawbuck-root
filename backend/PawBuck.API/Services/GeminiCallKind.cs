namespace PawBuck.API.Services;

/// <summary>Telemetry tags for Milo / Gemini API calls (Phase 0 domain AI platform).</summary>
public static class GeminiCallKind
{
    public const string ChatPlan = "chat_plan";
    public const string ChatAnswer = "chat_answer";
    public const string ChatJournal = "chat_journal";
    public const string MiloAsk = "milo_ask";
    public const string VisionClassify = "vision_classify";
    public const string VisionExtract = "vision_extract";
    public const string EmbedQuery = "embed_query";
    public const string ProactiveTip = "proactive_tip";
    public const string JournalTree = "journal_tree";
    public const string ClassifierLegacy = "classifier_legacy";
}
