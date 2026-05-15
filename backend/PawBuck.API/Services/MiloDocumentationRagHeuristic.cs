namespace PawBuck.API.Services;

/// <summary>
/// When the Gemini plan step omits <c>needsDocumentationRag</c>, product/FAQ questions still need
/// <see cref="IKnowledgeBaseService"/> context or Milo apologizes with an empty knowledge base.
/// </summary>
public static class MiloDocumentationRagHeuristic
{
    /// <summary>
    /// Returns true when the user message should retrieve FAQ / product documentation regardless of plan JSON.
    /// Keep in sync with <c>docs/pawbuck-product-help</c> topics; prefer narrow phrases over broad single words.
    /// </summary>
    public static bool ShouldForceDocumentationRag(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return false;

        var m = message.Trim().ToLowerInvariant();

        if (m.Contains("what is pawbuck", StringComparison.Ordinal) ||
            m.Contains("what's pawbuck", StringComparison.Ordinal) ||
            m.Contains("who is pawbuck", StringComparison.Ordinal))
            return true;

        if (m.Contains("pawbuck", StringComparison.Ordinal) &&
            (m.Contains("how much", StringComparison.Ordinal) ||
             m.Contains("cost", StringComparison.Ordinal) ||
             m.Contains("price", StringComparison.Ordinal) ||
             m.Contains("free", StringComparison.Ordinal)))
            return true;

        if (m.Contains("family sharing", StringComparison.Ordinal) ||
            m.Contains("family access", StringComparison.Ordinal) ||
            m.Contains("manage access", StringComparison.Ordinal) ||
            (m.Contains("invite", StringComparison.Ordinal) && m.Contains("pet", StringComparison.Ordinal)))
            return true;

        if (m.Contains("transfer", StringComparison.Ordinal) &&
            (m.Contains("how to", StringComparison.Ordinal) ||
             m.Contains("how do i", StringComparison.Ordinal) ||
             m.Contains("how do you", StringComparison.Ordinal) ||
             m.Contains("receive", StringComparison.Ordinal) ||
             m.Contains("accept", StringComparison.Ordinal) ||
             m.Contains("claim", StringComparison.Ordinal)))
            return true;

        if (m.Contains("pet passport", StringComparison.Ordinal) ||
            (m.Contains("share", StringComparison.Ordinal) && m.Contains("record", StringComparison.Ordinal)))
            return true;

        if (m.Contains("vaccination", StringComparison.Ordinal) &&
            (m.Contains("how", StringComparison.Ordinal) || m.Contains("add", StringComparison.Ordinal) || m.Contains("upload", StringComparison.Ordinal)))
            return true;

        if (m.Contains("@pawbuck", StringComparison.Ordinal) ||
            (m.Contains("pet", StringComparison.Ordinal) && m.Contains("email", StringComparison.Ordinal)))
            return true;

        if (m.Contains("book", StringComparison.Ordinal) && m.Contains("vet", StringComparison.Ordinal))
            return true;

        if (m.Contains("pawthon", StringComparison.Ordinal) || (m.Contains("walk", StringComparison.Ordinal) && m.Contains("how", StringComparison.Ordinal)))
            return true;

        if (m.Contains("journal", StringComparison.Ordinal) &&
            (m.Contains("how", StringComparison.Ordinal) ||
             m.Contains("log", StringComparison.Ordinal) ||
             m.Contains("note", StringComparison.Ordinal) ||
             m.Contains("track", StringComparison.Ordinal) ||
             m.Contains("write", StringComparison.Ordinal)))
            return true;

        if (m.Contains("note taking", StringComparison.Ordinal) ||
            m.Contains("note-taking", StringComparison.Ordinal) ||
            m.Contains("take notes", StringComparison.Ordinal) ||
            m.Contains("keep notes", StringComparison.Ordinal) ||
            (m.Contains("notes", StringComparison.Ordinal) &&
                (m.Contains("keep", StringComparison.Ordinal) ||
                 m.Contains("take", StringComparison.Ordinal) ||
                 m.Contains("write", StringComparison.Ordinal) ||
                 m.Contains("log", StringComparison.Ordinal))) ||
            (m.Contains("log", StringComparison.Ordinal) &&
                (m.Contains("symptom", StringComparison.Ordinal) ||
                 m.Contains("behavior", StringComparison.Ordinal) ||
                 m.Contains("behaviour", StringComparison.Ordinal))) ||
            (m.Contains("track", StringComparison.Ordinal) &&
                (m.Contains("symptom", StringComparison.Ordinal) ||
                 m.Contains("behavior", StringComparison.Ordinal) ||
                 m.Contains("behaviour", StringComparison.Ordinal))) ||
            (m.Contains("write down", StringComparison.Ordinal) && m.Contains("pet", StringComparison.Ordinal)))
            return true;

        if (m.Contains("what can milo", StringComparison.Ordinal) || m.Contains("what does milo", StringComparison.Ordinal))
            return true;

        if (m.Contains("contact support", StringComparison.Ordinal) ||
            (m.Contains("delete", StringComparison.Ordinal) && m.Contains("account", StringComparison.Ordinal)))
            return true;

        if (m.Contains("failed", StringComparison.Ordinal) && m.Contains("email", StringComparison.Ordinal))
            return true;

        if (m.StartsWith("how to ", StringComparison.Ordinal) ||
            m.StartsWith("how do i ", StringComparison.Ordinal) ||
            m.StartsWith("where do i ", StringComparison.Ordinal) ||
            m.StartsWith("where can i ", StringComparison.Ordinal))
            return true;

        return false;
    }

    /// <summary>
    /// Product-help Markdown filenames under <c>docs/pawbuck-product-help</c> to merge into RAG when the
    /// message clearly references those topics (in addition to vector search).
    /// </summary>
    public static IReadOnlyList<string> GetBoostSourceFiles(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return Array.Empty<string>();

        var m = message.Trim().ToLowerInvariant();
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (m.Contains("family sharing", StringComparison.Ordinal) ||
            m.Contains("family access", StringComparison.Ordinal) ||
            m.Contains("manage access", StringComparison.Ordinal) ||
            m.Contains("household", StringComparison.Ordinal) ||
            m.Contains("join household", StringComparison.Ordinal) ||
            m.Contains("care team", StringComparison.Ordinal) ||
            (m.Contains("invite", StringComparison.Ordinal) && m.Contains("family", StringComparison.Ordinal)))
        {
            set.Add("06-family-sharing.md");
        }

        if (m.Contains("transfer pet", StringComparison.Ordinal) ||
            m.Contains("pet transfer", StringComparison.Ordinal) ||
            m.Contains("ownership transfer", StringComparison.Ordinal) ||
            m.Contains("claim a pet", StringComparison.Ordinal) ||
            (m.Contains("transfer", StringComparison.Ordinal) &&
                (m.Contains("receive", StringComparison.Ordinal) ||
                 m.Contains("accept", StringComparison.Ordinal) ||
                 m.Contains("claim", StringComparison.Ordinal) ||
                 m.Contains("transferee", StringComparison.Ordinal) ||
                 m.Contains("new owner", StringComparison.Ordinal) ||
                 m.Contains("transfer code", StringComparison.Ordinal))))
        {
            set.Add("07-pet-transfer.md");
        }

        if (m.Contains("journal", StringComparison.Ordinal) ||
            m.Contains("note taking", StringComparison.Ordinal) ||
            m.Contains("note-taking", StringComparison.Ordinal) ||
            m.Contains("take notes", StringComparison.Ordinal) ||
            m.Contains("keep notes", StringComparison.Ordinal) ||
            (m.Contains("notes", StringComparison.Ordinal) &&
                (m.Contains("keep", StringComparison.Ordinal) ||
                 m.Contains("take", StringComparison.Ordinal) ||
                 m.Contains("write", StringComparison.Ordinal) ||
                 m.Contains("log", StringComparison.Ordinal))) ||
            m.Contains("behavior baseline", StringComparison.Ordinal) ||
            m.Contains("behaviour baseline", StringComparison.Ordinal) ||
            (m.Contains("log", StringComparison.Ordinal) &&
                (m.Contains("symptom", StringComparison.Ordinal) ||
                 m.Contains("behavior", StringComparison.Ordinal) ||
                 m.Contains("behaviour", StringComparison.Ordinal))) ||
            (m.Contains("track", StringComparison.Ordinal) &&
                (m.Contains("symptom", StringComparison.Ordinal) ||
                 m.Contains("behavior", StringComparison.Ordinal) ||
                 m.Contains("behaviour", StringComparison.Ordinal))) ||
            (m.Contains("write down", StringComparison.Ordinal) && m.Contains("pet", StringComparison.Ordinal)))
        {
            set.Add("11-pet-journal.md");
        }

        if (m.Contains("what can milo", StringComparison.Ordinal) ||
            m.Contains("what does milo", StringComparison.Ordinal) ||
            (m.Contains("milo", StringComparison.Ordinal) &&
                (m.Contains("help", StringComparison.Ordinal) ||
                 m.Contains("do", StringComparison.Ordinal))))
        {
            set.Add("08-milo.md");
        }

        return set.Count > 0 ? set.ToList() : Array.Empty<string>();
    }
}
