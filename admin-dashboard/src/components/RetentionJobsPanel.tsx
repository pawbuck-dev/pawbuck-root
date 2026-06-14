import { useCallback, useEffect, useState } from "react";
import { useAdminApp } from "@/context/AdminAppContext";
import { normalizePawbuckApiBase } from "@/api/supportClient";

type RetentionRun = {
  id: string;
  jobName: string;
  ranAt: string;
  rowsAffected: number;
  details?: string | null;
};

export function RetentionJobsPanel() {
  const { session, baseUrl } = useAdminApp();
  const [runs, setRuns] = useState<RetentionRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const origin = normalizePawbuckApiBase(baseUrl);
    const token = session?.access_token;
    if (!origin || !token) {
      setError("API or session not configured");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${origin}/api/support/retention/runs?limit=30`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { runs?: RetentionRun[] };
      setRuns(json.runs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load retention runs");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Retention jobs</h2>
          <p className="text-sm text-slate-600">GPS minimization and TTL job history</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-200 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="py-2 pr-4 font-medium">Job</th>
              <th className="py-2 pr-4 font-medium">Ran at</th>
              <th className="py-2 pr-4 font-medium">Rows</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-slate-500">
                  {loading ? "Loading…" : "No retention runs yet."}
                </td>
              </tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-mono text-xs">{r.jobName}</td>
                  <td className="py-2 pr-4">{new Date(r.ranAt).toLocaleString()}</td>
                  <td className="py-2 pr-4">{r.rowsAffected}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
