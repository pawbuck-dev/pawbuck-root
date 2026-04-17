import { SupportApiError, createSupportClient } from "@/api/supportClient";
import type { SubscriptionFeatureGateRow } from "@/types/support";
import { useCallback, useEffect, useState } from "react";

type FeatureGatesPanelProps = {
  client: ReturnType<typeof createSupportClient>;
};

export function FeatureGatesPanel({ client }: FeatureGatesPanelProps) {
  const [rows, setRows] = useState<SubscriptionFeatureGateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.listSubscriptionFeatureGates();
      setRows(res.items);
    } catch (e) {
      setRows([]);
      setError(e instanceof SupportApiError ? e.message : "Failed to load paywall settings");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (featureKey: string, requiresPremium: boolean) => {
    setSavingKey(featureKey);
    setError(null);
    try {
      const updated = await client.patchSubscriptionFeatureGate(featureKey, { requiresPremium });
      setRows((prev) => prev.map((r) => (r.featureKey === featureKey ? updated : r)));
    } catch (e) {
      setError(e instanceof SupportApiError ? e.message : "Save failed");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="panel panel--flush">
      <h2 className="panel__title">Paywall features</h2>
      <p className="muted" style={{ maxWidth: "42rem" }}>
        When <strong>Requires premium</strong> is on, free users see the upgrade flow for that area. Changes apply after
        the app refreshes gates (within about a minute). Server enforcement uses the same data (e.g. Milo chat).
      </p>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <div className="error">{error}</div> : null}

      {!loading && rows.length > 0 ? (
        <div className="table-scroll" style={{ marginTop: "1rem" }}>
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Key</th>
                <th>Requires premium</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.featureKey}>
                  <td>{r.label}</td>
                  <td className="muted" style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" }}>
                    {r.featureKey}
                  </td>
                  <td>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={r.requiresPremium}
                        disabled={savingKey === r.featureKey}
                        onChange={(e) => void toggle(r.featureKey, e.target.checked)}
                      />
                      {savingKey === r.featureKey ? <span className="muted">Saving…</span> : null}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && rows.length === 0 && !error ? (
        <p className="muted">No rows (run the latest Supabase migration for subscription_feature_gates).</p>
      ) : null}

      <p style={{ marginTop: "1rem" }}>
        <button type="button" className="btn btn-secondary btn--sm" onClick={() => void load()}>
          Reload
        </button>
      </p>
    </section>
  );
}
