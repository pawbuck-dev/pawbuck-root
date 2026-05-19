import { SupportApiError, createSupportClient } from "@/api/supportClient";
import type { MiloJournalConfigSnapshot, MiloJournalFeedbackAggregates } from "@/types/support";
import { useCallback, useEffect, useState } from "react";
import { MiloJournalChatSmoke } from "@/components/MiloJournalChatSmoke";

type MiloJournalPanelProps = {
  client: ReturnType<typeof createSupportClient>;
};

const defaultConfig = (): MiloJournalConfigSnapshot => ({
  recentMedicalWindowDays: 14,
  upcomingMilestoneWindowDays: 30,
  recentJournalNotesCount: 3,
  seniorAgeYears: 8,
  postVaccineFocusDays: 3,
  newMedicationFocusDays: 7,
  limpingLookbackHours: 48,
  quietJournalDays: 7,
  surgeryExamTypePatterns: ["surgery", "spay", "neuter", "dental", "extract", "procedure"],
  promptVersion: "v1",
  journalTemperature: 0.65,
  journalMaxOutputTokens: 1024,
  journalTreeInterviewEnabled: true,
});

export function MiloJournalPanel({ client }: MiloJournalPanelProps) {
  const [config, setConfig] = useState<MiloJournalConfigSnapshot>(defaultConfig);
  const [aggregates, setAggregates] = useState<MiloJournalFeedbackAggregates | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        client.getMiloJournalConfig(),
        client.getMiloJournalFeedbackAggregates(),
      ]);
      setConfig({ ...defaultConfig(), ...c });
      setAggregates(a);
    } catch (e) {
      setError(e instanceof SupportApiError ? e.message : "Failed to load journal Milo settings");
      setConfig(defaultConfig());
      setAggregates(null);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await client.patchMiloJournalConfig(config);
      setConfig({ ...defaultConfig(), ...updated });
    } catch (e) {
      setError(e instanceof SupportApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const num = (key: keyof MiloJournalConfigSnapshot) => (ev: React.ChangeEvent<HTMLInputElement>) => {
    const v = ev.target.valueAsNumber;
    if (Number.isNaN(v)) return;
    setConfig((prev) => ({ ...prev, [key]: v }));
  };

  if (loading) {
    return (
      <section className="panel">
        <h2 className="panel__title">Milo journal (contextual)</h2>
        <p className="muted">Loading…</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2 className="panel__title">Milo journal — tuning & feedback</h2>

      <MiloJournalChatSmoke client={client} />

      <p className="muted" style={{ marginBottom: "1rem" }}>
        Thresholds and prompt version for contextual journal chat (PawBuck.API). Changes apply within a few minutes on
        API instances (in-memory cache).
      </p>

      {error ? <div className="error">{error}</div> : null}

      {aggregates ? (
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>Feedback aggregates</h3>
          <p className="muted">
            Total: {aggregates.totalFeedback} · Up: {aggregates.upCount} · Down: {aggregates.downCount}
          </p>
          {aggregates.byTreeVersion?.length > 0 ? (
            <div className="table-scroll" style={{ marginTop: 12 }}>
              <h4 style={{ fontSize: "0.9rem", marginBottom: 6 }}>By tree version</h4>
              <table>
                <thead>
                  <tr>
                    <th>Tree version</th>
                    <th>Up</th>
                    <th>Down</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregates.byTreeVersion.map((row) => (
                    <tr key={row.promptVersion}>
                      <td>{row.promptVersion}</td>
                      <td>{row.upCount}</td>
                      <td>{row.downCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {aggregates.byPromptVersion.length > 0 ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Prompt version</th>
                    <th>Up</th>
                    <th>Down</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregates.byPromptVersion.map((row) => (
                    <tr key={row.promptVersion}>
                      <td>{row.promptVersion}</td>
                      <td>{row.upCount}</td>
                      <td>{row.downCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No feedback rows yet.</p>
          )}
        </div>
      ) : null}

      <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>Configuration</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <label>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Recent medical window (days)
          </span>
          <input type="number" min={1} max={90} value={config.recentMedicalWindowDays} onChange={num("recentMedicalWindowDays")} />
        </label>
        <label>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Upcoming milestone window (days)
          </span>
          <input
            type="number"
            min={1}
            max={120}
            value={config.upcomingMilestoneWindowDays}
            onChange={num("upcomingMilestoneWindowDays")}
          />
        </label>
        <label>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Journal notes to include
          </span>
          <input type="number" min={1} max={20} value={config.recentJournalNotesCount} onChange={num("recentJournalNotesCount")} />
        </label>
        <label>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Senior age (years)
          </span>
          <input type="number" min={1} max={30} value={config.seniorAgeYears} onChange={num("seniorAgeYears")} />
        </label>
        <label>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Post-vaccine focus (days)
          </span>
          <input type="number" min={1} max={14} value={config.postVaccineFocusDays} onChange={num("postVaccineFocusDays")} />
        </label>
        <label>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            New medication focus (days)
          </span>
          <input type="number" min={1} max={30} value={config.newMedicationFocusDays} onChange={num("newMedicationFocusDays")} />
        </label>
        <label>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Limping lookback (hours)
          </span>
          <input type="number" min={1} max={168} value={config.limpingLookbackHours} onChange={num("limpingLookbackHours")} />
        </label>
        <label>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Quiet journal (days)
          </span>
          <input type="number" min={1} max={30} value={config.quietJournalDays} onChange={num("quietJournalDays")} />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Prompt version (opaque id for analytics)
          </span>
          <input
            type="text"
            value={config.promptVersion}
            onChange={(e) => setConfig((p) => ({ ...p, promptVersion: e.target.value }))}
          />
        </label>
        <label style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={config.journalTreeInterviewEnabled === true}
            onChange={(e) =>
              setConfig((p) => ({ ...p, journalTreeInterviewEnabled: e.target.checked }))
            }
          />
          <span>Enable tree-driven journal interviews (v1.5)</span>
        </label>
        <label>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Journal temperature
          </span>
          <input
            type="number"
            step={0.05}
            min={0.1}
            max={1.5}
            value={config.journalTemperature}
            onChange={num("journalTemperature")}
          />
        </label>
        <label>
          <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
            Max output tokens
          </span>
          <input
            type="number"
            min={256}
            max={8192}
            step={64}
            value={config.journalMaxOutputTokens}
            onChange={num("journalMaxOutputTokens")}
          />
        </label>
      </div>

      <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save configuration"}
      </button>
      <button type="button" className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => void load()}>
        Reload
      </button>
    </section>
  );
}
