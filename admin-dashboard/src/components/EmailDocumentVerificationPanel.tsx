import { SupportApiError, createSupportClient } from "@/api/supportClient";
import type {
  CountryEmailDocumentVerificationRow,
  EmailDocumentType,
  PatchCountryEmailDocumentVerificationBody,
} from "@/types/support";
import { useCallback, useEffect, useState } from "react";

const DOCUMENT_TYPES: { key: EmailDocumentType; label: string }[] = [
  { key: "clinical_exams", label: "Clinical exams" },
  { key: "medications", label: "Medications" },
  { key: "lab_results", label: "Lab results" },
  { key: "vaccinations", label: "Vaccinations" },
  { key: "travel_certificate", label: "Travel certificate" },
  { key: "billing_invoice", label: "Billing / invoice" },
];

type EmailDocumentVerificationPanelProps = {
  client: ReturnType<typeof createSupportClient>;
};

type Draft = {
  allowNameOnlyDocumentTypes: string[];
  breedRequiredDocumentTypes: string[];
  fuzzyMatchThreshold: number;
  enabled: boolean;
  notes: string;
};

function draftFromRow(row: CountryEmailDocumentVerificationRow): Draft {
  return {
    allowNameOnlyDocumentTypes: [...row.allowNameOnlyDocumentTypes],
    breedRequiredDocumentTypes: [...row.breedRequiredDocumentTypes],
    fuzzyMatchThreshold: row.fuzzyMatchThreshold,
    enabled: row.enabled,
    notes: row.notes ?? "",
  };
}

function sortedJson(arr: string[]): string {
  return JSON.stringify([...arr].sort());
}

export function EmailDocumentVerificationPanel({ client }: EmailDocumentVerificationPanelProps) {
  const [rows, setRows] = useState<CountryEmailDocumentVerificationRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCountry, setSavingCountry] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.listEmailDocumentVerificationRules();
      setRows(res.items);
      setDrafts(Object.fromEntries(res.items.map((r) => [r.country, draftFromRow(r)])));
    } catch (e) {
      setRows([]);
      setDrafts({});
      setError(
        e instanceof SupportApiError
          ? e.message
          : "Failed to load email document verification rules",
      );
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDraft = (country: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({
      ...prev,
      [country]: { ...prev[country], ...patch },
    }));
  };

  const toggleType = (
    country: string,
    field: "allowNameOnlyDocumentTypes" | "breedRequiredDocumentTypes",
    type: string,
    checked: boolean,
  ) => {
    const d = drafts[country];
    if (!d) return;
    const set = new Set(d[field]);
    if (checked) set.add(type);
    else set.delete(type);
    updateDraft(country, { [field]: [...set] });
  };

  const save = async (country: string) => {
    const d = drafts[country];
    if (!d) return;
    setSavingCountry(country);
    setError(null);
    const body: PatchCountryEmailDocumentVerificationBody = {
      allowNameOnlyDocumentTypes: d.allowNameOnlyDocumentTypes,
      breedRequiredDocumentTypes: d.breedRequiredDocumentTypes,
      fuzzyMatchThreshold: d.fuzzyMatchThreshold,
      enabled: d.enabled,
      notes: d.notes.trim() || null,
    };
    try {
      const updated = await client.patchEmailDocumentVerificationRule(country, body);
      setRows((prev) => prev.map((r) => (r.country === country ? updated : r)));
      setDrafts((prev) => ({ ...prev, [country]: draftFromRow(updated) }));
    } catch (e) {
      setError(e instanceof SupportApiError ? e.message : "Save failed");
    } finally {
      setSavingCountry(null);
    }
  };

  return (
    <section className="panel panel--flush" style={{ marginTop: "2rem" }}>
      <h2 className="panel__title">Email document verification (by country)</h2>
      <p className="muted" style={{ maxWidth: "48rem" }}>
        Rules apply when pets receive health documents by email. <strong>Name-only</strong> types
        auto-file when the pet&apos;s first name matches but breed is missing on the PDF (e.g.
        post-op sheets). <strong>Breed required</strong> types always need breed on the document.
        Matches <code>pets.country</code> display names.
      </p>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <div className="error">{error}</div> : null}

      {!loading && rows.length > 0 ? (
        <div style={{ marginTop: "1rem" }}>
          {rows.map((row) => {
            const d = drafts[row.country];
            if (!d) return null;
            const dirty =
              sortedJson(d.allowNameOnlyDocumentTypes) !==
                sortedJson(row.allowNameOnlyDocumentTypes) ||
              sortedJson(d.breedRequiredDocumentTypes) !==
                sortedJson(row.breedRequiredDocumentTypes) ||
              d.fuzzyMatchThreshold !== row.fuzzyMatchThreshold ||
              d.enabled !== row.enabled ||
              (d.notes.trim() || "") !== (row.notes ?? "");

            return (
              <details
                key={row.country}
                style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border)" }}
              >
                <summary style={{ cursor: "pointer", padding: "0.5rem 0" }}>
                  <strong>{row.country}</strong>
                  {!d.enabled ? <span className="muted"> — disabled</span> : null}
                </summary>
                <div style={{ padding: "0.75rem 0 1rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={(e) => updateDraft(row.country, { enabled: e.target.checked })}
                    />
                    Enabled for this country
                  </label>

                  <label className="muted" style={{ display: "block", marginBottom: "0.25rem" }}>
                    Fuzzy name match threshold (0.5–1.0)
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    max={1}
                    step={0.05}
                    value={d.fuzzyMatchThreshold}
                    style={{ width: "6rem", marginBottom: "1rem" }}
                    onChange={(e) =>
                      updateDraft(row.country, {
                        fuzzyMatchThreshold: Number.parseFloat(e.target.value) || 0.7,
                      })
                    }
                  />

                  <p className="muted" style={{ marginBottom: "0.35rem" }}>
                    Allow name-only (no breed on document)
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem 1.25rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {DOCUMENT_TYPES.map(({ key, label }) => (
                      <label key={`name-${key}`} style={{ display: "inline-flex", gap: "0.35rem" }}>
                        <input
                          type="checkbox"
                          checked={d.allowNameOnlyDocumentTypes.includes(key)}
                          onChange={(e) =>
                            toggleType(
                              row.country,
                              "allowNameOnlyDocumentTypes",
                              key,
                              e.target.checked,
                            )
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <p className="muted" style={{ marginBottom: "0.35rem" }}>
                    Breed required on document
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem 1.25rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {DOCUMENT_TYPES.map(({ key, label }) => (
                      <label key={`breed-${key}`} style={{ display: "inline-flex", gap: "0.35rem" }}>
                        <input
                          type="checkbox"
                          checked={d.breedRequiredDocumentTypes.includes(key)}
                          onChange={(e) =>
                            toggleType(
                              row.country,
                              "breedRequiredDocumentTypes",
                              key,
                              e.target.checked,
                            )
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <label className="muted" style={{ display: "block", marginBottom: "0.25rem" }}>
                    Internal notes
                  </label>
                  <input
                    type="text"
                    value={d.notes}
                    style={{ width: "100%", maxWidth: "28rem", marginBottom: "0.75rem" }}
                    onChange={(e) => updateDraft(row.country, { notes: e.target.value })}
                  />

                  <button
                    type="button"
                    className="btn btn-primary btn--sm"
                    disabled={!dirty || savingCountry === row.country}
                    onClick={() => void save(row.country)}
                  >
                    {savingCountry === row.country ? "Saving…" : dirty ? "Save changes" : "Saved"}
                  </button>
                </div>
              </details>
            );
          })}
        </div>
      ) : null}

      {!loading && rows.length === 0 && !error ? (
        <p className="muted">
          No countries configured (run migration{" "}
          <code>20260518140000_country_email_document_verification</code>).
        </p>
      ) : null}

      <p style={{ marginTop: "1rem" }}>
        <button type="button" className="btn btn-secondary btn--sm" onClick={() => void load()}>
          Reload
        </button>
      </p>
    </section>
  );
}
