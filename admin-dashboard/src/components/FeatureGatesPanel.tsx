import { SupportApiError, createSupportClient } from "@/api/supportClient";
import type { SubscriptionFeatureGateRow } from "@/types/support";
import { useCallback, useEffect, useState } from "react";

const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "individual", label: "Individual" },
  { value: "family", label: "Family" },
] as const;

type FeatureGatesPanelProps = {
  client: ReturnType<typeof createSupportClient>;
};

export function FeatureGatesPanel({ client }: FeatureGatesPanelProps) {
  const [rows, setRows] = useState<SubscriptionFeatureGateRow[]>([]);
  const [foundingPurchaseCount, setFoundingPurchaseCount] = useState<number | null>(null);
  const [foundingSpotsRemaining, setFoundingSpotsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [gatesRes, foundingRes] = await Promise.all([
        client.listSubscriptionFeatureGates(),
        client.getFoundingMemberStats(),
      ]);
      setRows(gatesRes.items);
      setFoundingPurchaseCount(foundingRes.purchaseCount);
      setFoundingSpotsRemaining(foundingRes.spotsRemaining);
    } catch (e) {
      setRows([]);
      setFoundingPurchaseCount(null);
      setFoundingSpotsRemaining(null);
      setError(e instanceof SupportApiError ? e.message : "Failed to load paywall settings");
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const setMinimumPlan = async (featureKey: string, minimumPlan: string) => {
    setSavingKey(featureKey);
    setError(null);
    try {
      const updated = await client.patchSubscriptionFeatureGate(featureKey, { minimumPlan });
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
        Set the <strong>minimum plan</strong> per feature. Free users see the upgrade flow when their plan is below
        the minimum. Server enforcement uses the same data (Milo chat, document caps, etc.).
      </p>

      {foundingPurchaseCount != null && foundingSpotsRemaining != null ? (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Founding Member lifetime: <strong>{foundingPurchaseCount}</strong> / 500 sold ·{" "}
          <strong>{foundingSpotsRemaining}</strong> spots remaining
        </p>
      ) : null}

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <div className="error">{error}</div> : null}

      {!loading && rows.length > 0 ? (
        <div className="table-scroll" style={{ marginTop: "1rem" }}>
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Key</th>
                <th>Minimum plan</th>
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
                      <select
                        value={r.minimumPlan}
                        disabled={savingKey === r.featureKey}
                        onChange={(e) => void setMinimumPlan(r.featureKey, e.target.value)}
                      >
                        {PLAN_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
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
