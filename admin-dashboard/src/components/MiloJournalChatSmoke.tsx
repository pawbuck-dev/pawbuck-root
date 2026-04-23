import { SupportApiError, createSupportClient } from "@/api/supportClient";
import type { MiloChatApiResponse, SupportPetRow, SupportUserRow } from "@/types/support";
import { useCallback, useState } from "react";

type MiloJournalChatSmokeProps = {
  client: ReturnType<typeof createSupportClient>;
};

const defaultMessage = "How was your day?";

export function MiloJournalChatSmoke({ client }: MiloJournalChatSmokeProps) {
  const [emailQuery, setEmailQuery] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [users, setUsers] = useState<SupportUserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pets, setPets] = useState<SupportPetRow[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [message, setMessage] = useState(defaultMessage);
  const [journalMode, setJournalMode] = useState(true);
  const [smokeBusy, setSmokeBusy] = useState(false);
  const [smokeResult, setSmokeResult] = useState<MiloChatApiResponse | null>(null);
  const [smokeError, setSmokeError] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  const searchByEmail = useCallback(async () => {
    const q = emailQuery.trim();
    if (q.length < 2) {
      setSmokeError("Enter at least 2 characters of the account email.");
      return;
    }
    setSearchBusy(true);
    setSmokeError(null);
    setUsers([]);
    setSelectedUserId(null);
    setPets([]);
    setSelectedPetId(null);
    setSmokeResult(null);
    try {
      const rows = await client.searchUsers(q);
      setUsers(rows);
      if (rows.length === 0) {
        setSmokeError("No accounts matched that search.");
      }
    } catch (e) {
      setSmokeError(e instanceof SupportApiError ? e.message : "Search failed.");
    } finally {
      setSearchBusy(false);
    }
  }, [client, emailQuery]);

  const loadPetsForUser = useCallback(
    async (userId: string) => {
      setSelectedUserId(userId);
      setSelectedPetId(null);
      setPets([]);
      setSmokeResult(null);
      setPetsLoading(true);
      setSmokeError(null);
      try {
        const list = await client.getPetsForUser(userId);
        setPets(list);
        if (list.length === 0) {
          setSmokeError("This account has no pets yet.");
        }
      } catch (e) {
        setSmokeError(e instanceof SupportApiError ? e.message : "Could not load pets.");
      } finally {
        setPetsLoading(false);
      }
    },
    [client],
  );

  const runSmoke = async () => {
    if (!selectedUserId || !selectedPetId) {
      setSmokeError("Choose an account and a pet first.");
      return;
    }
    const msg = message.trim();
    if (!msg) {
      setSmokeError("Enter a message to send.");
      return;
    }
    setSmokeBusy(true);
    setSmokeError(null);
    setSmokeResult(null);
    try {
      const res = await client.postMiloJournalChatSmoke({
        userId: selectedUserId,
        petId: selectedPetId,
        message: msg,
        journalMode,
      });
      setSmokeResult(res);
    } catch (e) {
      setSmokeResult(null);
      setSmokeError(e instanceof SupportApiError ? e.message : "Request failed.");
    } finally {
      setSmokeBusy(false);
    }
  };

  return (
    <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border, #333)" }}>
      <h3 style={{ fontSize: "1.05rem", marginBottom: 8 }}>Live journal test (support)</h3>
      <p className="muted" style={{ marginBottom: "1rem", maxWidth: "52rem" }}>
        Runs the same Milo chat logic as the app for the account and pet you pick. Use this to verify journal replies without
        curl or API tokens. Admin/support access only.
      </p>

      {smokeError ? <div className="error" style={{ marginBottom: "0.75rem" }}>{smokeError}</div> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-end", marginBottom: "0.75rem" }}>
        <label style={{ flex: "1 1 220px" }}>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Search account by email
          </span>
          <input
            type="search"
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void searchByEmail();
            }}
            placeholder="name@example.com"
            autoComplete="off"
          />
        </label>
        <button type="button" className="btn btn-secondary" disabled={searchBusy} onClick={() => void searchByEmail()}>
          {searchBusy ? "Searching…" : "Search"}
        </button>
      </div>

      {users.length > 0 ? (
        <label style={{ display: "block", marginBottom: "0.75rem", maxWidth: "32rem" }}>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Account
          </span>
          <select
            value={selectedUserId ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              if (id) void loadPetsForUser(id);
              else {
                setSelectedUserId(null);
                setPets([]);
                setSelectedPetId(null);
              }
            }}
          >
            <option value="">Select…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.email ?? "(no email)") + " — " + u.id.slice(0, 8)}…
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {petsLoading ? <p className="muted">Loading pets…</p> : null}

      {selectedUserId && pets.length > 0 ? (
        <label style={{ display: "block", marginBottom: "0.75rem", maxWidth: "32rem" }}>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Pet
          </span>
          <select value={selectedPetId ?? ""} onChange={(e) => setSelectedPetId(e.target.value || null)}>
            <option value="">Select…</option>
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.animalType})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label style={{ display: "block", marginBottom: "0.75rem", maxWidth: "40rem" }}>
        <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
          Message
        </span>
        <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.75rem" }}>
        <input type="checkbox" checked={journalMode} onChange={(e) => setJournalMode(e.target.checked)} />
        <span>Journal mode (structured reply + quick replies)</span>
      </label>

      <button type="button" className="btn btn-primary" disabled={smokeBusy || !selectedPetId} onClick={() => void runSmoke()}>
        {smokeBusy ? "Sending…" : "Send test"}
      </button>

      {smokeResult ? (
        <div style={{ marginTop: "1.25rem" }}>
          <h4 style={{ fontSize: "0.95rem", marginBottom: 8 }}>Milo reply</h4>
          <div
            style={{
              padding: "1rem",
              borderRadius: 8,
              background: "var(--panel-elevated, rgba(255,255,255,0.04))",
              whiteSpace: "pre-wrap",
              marginBottom: "0.75rem",
            }}
          >
            {smokeResult.answer}
          </div>
          {smokeResult.suggestedReplies && smokeResult.suggestedReplies.length > 0 ? (
            <p className="muted" style={{ marginBottom: "0.5rem" }}>
              <strong>Suggested replies:</strong> {smokeResult.suggestedReplies.join(" · ")}
            </p>
          ) : null}
          <p className="muted" style={{ marginBottom: "0.5rem" }}>
            Journal complete: {smokeResult.journalSessionComplete ? "yes" : "no"}
            {smokeResult.promptVersion ? ` · Prompt version: ${smokeResult.promptVersion}` : ""}
            {smokeResult.responseId ? ` · Response id: ${smokeResult.responseId}` : ""}
          </p>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 4 }} onClick={() => setShowTechnical((v) => !v)}>
            {showTechnical ? "Hide" : "Show"} technical details
          </button>
          {showTechnical ? (
            <pre
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem",
                overflow: "auto",
                fontSize: "0.8rem",
                borderRadius: 6,
                background: "var(--code-bg, #1a1a1a)",
              }}
            >
              {JSON.stringify(smokeResult, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
