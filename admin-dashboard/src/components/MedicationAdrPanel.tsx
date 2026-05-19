import { SupportApiError, createSupportClient } from "@/api/supportClient";
import type {
  CreateMedicationAdrOverrideBody,
  MedicationAdrOverrideRow,
  MedicationAdrStats,
} from "@/types/support";
import { useCallback, useEffect, useState } from "react";

type Props = {
  client: ReturnType<typeof createSupportClient>;
};

export function MedicationAdrPanel({ client }: Props) {
  const [stats, setStats] = useState<MedicationAdrStats | null>(null);
  const [overrides, setOverrides] = useState<MedicationAdrOverrideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [genericName, setGenericName] = useState("");
  const [labelText, setLabelText] = useState("");
  const [symptomTaxonomy, setSymptomTaxonomy] = useState("vomiting, lethargy");
  const [savingOverride, setSavingOverride] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, o] = await Promise.all([
        client.getMedicationAdrStats(),
        client.listMedicationAdrOverrides(),
      ]);
      setStats(s);
      setOverrides(o);
    } catch (e) {
      setStats(null);
      setOverrides([]);
      setError(e instanceof SupportApiError ? e.message : "Failed to load ADR data");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const runIngest = async () => {
    setIngesting(true);
    setError(null);
    try {
      await client.runMedicationAdrIngest("dailymed-manual");
      await load();
    } catch (e) {
      setError(e instanceof SupportApiError ? e.message : "Ingest failed");
    } finally {
      setIngesting(false);
    }
  };

  const createOverride = async () => {
    if (!labelText.trim()) return;
    setSavingOverride(true);
    setError(null);
    try {
      const body: CreateMedicationAdrOverrideBody = {
        genericName: genericName.trim() || undefined,
        labelText: labelText.trim(),
        symptomTaxonomy: symptomTaxonomy
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        confidence: 0.95,
      };
      await client.createMedicationAdrOverride(body);
      setLabelText("");
      setGenericName("");
      await load();
    } catch (e) {
      setError(e instanceof SupportApiError ? e.message : "Override create failed");
    } finally {
      setSavingOverride(false);
    }
  };

  const deactivate = async (id: string) => {
    setError(null);
    try {
      await client.deactivateMedicationAdrOverride(id);
      await load();
    } catch (e) {
      setError(e instanceof SupportApiError ? e.message : "Deactivate failed");
    }
  };

  return (
    <section className="panel" style={{ marginTop: "1.5rem" }}>
      <h2 className="panel__title">Medication ADR database</h2>
      <p className="muted">
        DailyMed SPL ingest + curated overrides for journal context surfacing (Apoquel, NSAIDs, etc.).
      </p>
      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <div className="error">{error}</div> : null}
      {stats ? (
        <ul style={{ marginTop: "0.75rem" }}>
          <li>Products: {stats.productCount}</li>
          <li>ADR entries: {stats.entryCount}</li>
          <li>Overrides: {stats.overrideCount}</li>
          <li>Last run: {stats.lastIngestionRun ?? "—"}</li>
        </ul>
      ) : null}
      <p style={{ marginTop: "1rem" }}>
        <button type="button" className="btn btn-secondary btn--sm" onClick={() => void load()}>
          Reload
        </button>{" "}
        <button
          type="button"
          className="btn btn-primary btn--sm"
          disabled={ingesting}
          onClick={() => void runIngest()}
        >
          {ingesting ? "Running…" : "Run DailyMed ingest"}
        </button>
      </p>

      <h3 style={{ fontSize: "1rem", marginTop: "1.25rem", marginBottom: 8 }}>Overrides</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "0.5rem",
          marginBottom: "0.75rem",
        }}
      >
        <label>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            Generic name
          </span>
          <input type="text" value={genericName} onChange={(e) => setGenericName(e.target.value)} />
        </label>
        <label>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            Label text
          </span>
          <input type="text" value={labelText} onChange={(e) => setLabelText(e.target.value)} />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            Symptom taxonomy (comma-separated)
          </span>
          <input
            type="text"
            value={symptomTaxonomy}
            onChange={(e) => setSymptomTaxonomy(e.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        className="btn btn-secondary btn--sm"
        disabled={savingOverride}
        onClick={() => void createOverride()}
      >
        {savingOverride ? "Saving…" : "Add override"}
      </button>

      {overrides.length > 0 ? (
        <div className="table-scroll" style={{ marginTop: "1rem" }}>
          <table>
            <thead>
              <tr>
                <th>Generic</th>
                <th>Label</th>
                <th>Taxonomy</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {overrides.map((row) => (
                <tr key={row.id}>
                  <td>{row.genericName ?? "—"}</td>
                  <td>{row.labelText}</td>
                  <td>{row.symptomTaxonomy.join(", ")}</td>
                  <td>{row.active ? "yes" : "no"}</td>
                  <td>
                    {row.active ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn--sm"
                        onClick={() => void deactivate(row.id)}
                      >
                        Deactivate
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          No overrides yet.
        </p>
      )}
    </section>
  );
}
