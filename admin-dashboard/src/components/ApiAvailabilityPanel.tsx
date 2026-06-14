import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useState } from "react";
import { normalizePawbuckApiBase } from "@/api/supportClient";
import { useAdminApp } from "@/context/AdminAppContext";
import { useOpsAvailability, useOpsHealth } from "@/hooks/supportQueries";
import type { SupportOpsProbeSnapshot } from "@/types/support";

type PublicHealthState = {
  ok: boolean;
  latencyMs: number | null;
  status: string | null;
  error: string | null;
  checkedAt: string;
};

function statusPill(ok: boolean | null | undefined) {
  if (ok == null) return "bg-slate-100 text-slate-600";
  return ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900";
}

function formatPct(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function probeLabel(name: string) {
  const map: Record<string, string> = {
    postgres: "Postgres",
    mail_pipeline: "Mail pipeline",
    journal_checkin: "Journal check-in",
    overall: "Overall",
    api_health_external: "API health (external)",
  };
  return map[name] ?? name;
}

export function ApiAvailabilityPanel() {
  const { baseUrl } = useAdminApp();
  const healthQuery = useOpsHealth();
  const availabilityQuery = useOpsAvailability(7);
  const [publicHealth, setPublicHealth] = useState<PublicHealthState | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);

  const pingPublicHealth = useCallback(async () => {
    const origin = normalizePawbuckApiBase(baseUrl);
    if (!origin) {
      setPublicHealth({
        ok: false,
        latencyMs: null,
        status: null,
        error: "API base URL not configured",
        checkedAt: new Date().toISOString(),
      });
      return;
    }

    setPublicLoading(true);
    const started = performance.now();
    try {
      const res = await fetch(`${origin}/api/health`);
      const latencyMs = Math.round(performance.now() - started);
      let status: string | null = null;
      if (res.ok) {
        const json = (await res.json()) as { status?: string };
        status = json.status ?? null;
      }
      setPublicHealth({
        ok: res.ok && status === "healthy",
        latencyMs,
        status,
        error: res.ok ? (status === "healthy" ? null : "status not healthy") : `HTTP ${res.status}`,
        checkedAt: new Date().toISOString(),
      });
    } catch (e) {
      setPublicHealth({
        ok: false,
        latencyMs: Math.round(performance.now() - started),
        status: null,
        error: e instanceof Error ? e.message : "Request failed",
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setPublicLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    void pingPublicHealth();
  }, [pingPublicHealth]);

  const health = healthQuery.data;
  const availability = availabilityQuery.data;
  const latestByName = new Map<string, SupportOpsProbeSnapshot>(
    (health?.latestProbes ?? []).map((p) => [p.probeName, p]),
  );

  const chartData =
    availability?.dailyOverall?.map((d) => ({
      day: d.date.slice(5),
      availability: d.availabilityPct,
      samples: d.samples,
    })) ?? [];

  const cloudWatchRegion = "us-east-1";
  const cloudWatchUrl = `https://${cloudWatchRegion}.console.aws.amazon.com/cloudwatch/home?region=${cloudWatchRegion}#alarmsV2:`;

  return (
    <section className="panel mb-6" aria-label="API availability">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="panel__title">API availability</h2>
          <p className="muted text-sm" style={{ maxWidth: "42rem" }}>
            Live health from your browser, deep checks from PawBuck.API, and 5-minute synthetics (ECS worker +
            GitHub Actions). Infra alarms: CloudWatch on the ALB.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={() => void pingPublicHealth()}>
            {publicLoading ? "Pinging…" : "Re-ping /api/health"}
          </button>
          <a
            href={cloudWatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm no-underline"
          >
            CloudWatch alarms
          </a>
        </div>
      </div>

      <div className="stat-grid mt-4">
        <div className="stat-card stat-card--primary">
          <div className="stat-card__label">Public /api/health</div>
          <div className="stat-card__value text-xl">
            {publicLoading && !publicHealth ? "…" : publicHealth?.ok ? "Up" : "Down"}
          </div>
          <p className="muted text-xs mt-1">
            {publicHealth?.latencyMs != null ? `${publicHealth.latencyMs} ms` : "—"}
            {publicHealth?.error ? ` · ${publicHealth.error}` : ""}
          </p>
        </div>
        <div className="stat-card stat-card--teal">
          <div className="stat-card__label">Postgres (server ping)</div>
          <div className="stat-card__value text-xl">
            {healthQuery.isLoading ? "…" : health?.postgresLatencyMs != null ? "OK" : "—"}
          </div>
          <p className="muted text-xs mt-1">
            {health?.postgresLatencyMs != null ? `${health.postgresLatencyMs} ms` : "Not checked"}
          </p>
        </div>
        <div className="stat-card stat-card--accent">
          <div className="stat-card__label">Overall (24h / 7d)</div>
          <div className="stat-card__value text-xl">
            {availabilityQuery.isLoading
              ? "…"
              : `${formatPct(availability?.overallAvailability24h)} / ${formatPct(availability?.overallAvailability7d)}`}
          </div>
          <p className="muted text-xs mt-1">From stored probe history</p>
        </div>
      </div>

      {health?.checks?.length ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Configuration checks</h3>
          <ul className="space-y-2">
            {health.checks.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPill(c.ok)}`}>
                  {c.ok ? "OK" : "Fail"}
                </span>
                <span className="font-medium text-slate-800">{c.label}</span>
                {!c.ok ? <span className="text-slate-600">{c.hint}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {availability?.probes?.length ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Synthetic probes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1 pr-3">Probe</th>
                  <th className="py-1 pr-3">Last</th>
                  <th className="py-1 pr-3">24h</th>
                  <th className="py-1 pr-3">7d</th>
                  <th className="py-1">Note</th>
                </tr>
              </thead>
              <tbody>
                {availability.probes.map((p) => {
                  const latest = latestByName.get(p.probeName);
                  return (
                    <tr key={p.probeName} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-medium">{p.label || probeLabel(p.probeName)}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusPill(p.lastOk)}`}
                        >
                          {p.lastOk == null ? "—" : p.lastOk ? "OK" : "Fail"}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{formatPct(p.availability24h)}</td>
                      <td className="py-2 pr-3">{formatPct(p.availability7d)}</td>
                      <td className="py-2 text-slate-600">
                        {p.lastErrorSummary ??
                          (latest?.latencyMs != null ? `${latest.latencyMs} ms` : "")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : availabilityQuery.isLoading ? (
        <p className="muted mt-4 text-sm">Loading probe history…</p>
      ) : (
        <p className="muted mt-4 text-sm">
          No probe history yet. After the API deploys and the migration runs, the ECS worker records probes every
          5 minutes.
        </p>
      )}

      <div className="chart-panel mt-4">
        <h3 className="chart-panel__title">Overall availability by day (UTC)</h3>
        {availabilityQuery.isLoading ? (
          <p className="muted">Loading chart…</p>
        ) : chartData.length === 0 ? (
          <p className="muted">No daily samples yet.</p>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#64748b" width={36} />
                <Tooltip
                  formatter={(value) => [
                    typeof value === "number" ? `${value.toFixed(1)}%` : String(value),
                    "Availability",
                  ]}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="availability"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ fill: "#0d9488", r: 3 }}
                  name="Availability"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {health?.checkedAt ? (
        <p className="muted mt-3 text-xs">Server checks at {new Date(health.checkedAt).toLocaleString()}</p>
      ) : null}
    </section>
  );
}
