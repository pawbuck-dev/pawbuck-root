import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createSupportClient, SupportApiError } from "@/api/supportClient";
import type { SupportDocumentProcessingMetricsResponse } from "@/types/support";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  client: ReturnType<typeof createSupportClient>;
  onOpenMailErrors?: () => void;
};

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDayYmd(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return toYmd(d);
}

function exclusiveEndIsoFromYmd(ymd: string): string {
  const [y, m, day] = ymd.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(y, m - 1, day + 1));
  return d.toISOString();
}

function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, " ");
}

function formatUtcDate(iso?: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function buildCategoryTrendChart(
  rows: SupportDocumentProcessingMetricsResponse["email"]["dailyFailuresByCategory"],
  topCategories: string[],
) {
  const byDate = new Map<string, Record<string, string | number>>();
  for (const row of rows) {
    if (!topCategories.includes(row.category)) continue;
    const day = row.date.slice(5);
    const entry = byDate.get(row.date) ?? { day };
    entry[row.label] = row.count;
    byDate.set(row.date, entry);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

const CATEGORY_COLORS = ["#dc2626", "#ea580c", "#ca8a04", "#0d9488", "#6366f1"];

export function DocumentProcessingMetricsPanel({ client, onOpenMailErrors }: Props) {
  const [dateFrom, setDateFrom] = useState(() => startOfUtcDayYmd(30));
  const [dateTo, setDateTo] = useState(() => toYmd(new Date()));
  const [metrics, setMetrics] = useState<SupportDocumentProcessingMetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromIso = useMemo(() => `${dateFrom}T00:00:00.000Z`, [dateFrom]);
  const toIso = useMemo(() => exclusiveEndIsoFromYmd(dateTo), [dateTo]);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.getDocumentProcessingMetrics(fromIso, toIso);
      setMetrics(res);
    } catch (e) {
      setMetrics(null);
      setError(e instanceof SupportApiError ? e.message : "Failed to load processing metrics.");
    } finally {
      setLoading(false);
    }
  }, [client, fromIso, toIso]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const dailyChartData =
    metrics?.email.dailyVolume.map((d) => ({
      day: d.date.slice(5),
      succeeded: d.succeeded,
      failed: d.failed,
    })) ?? [];

  const categoryChartData =
    metrics?.email.byFailureCategory.slice(0, 10).map((b) => ({
      label: b.label,
      count: b.count,
    })) ?? [];

  const topCategoryKeys = metrics?.email.byFailureCategory.slice(0, 4).map((b) => b.category) ?? [];
  const categoryTrendData = metrics
    ? buildCategoryTrendChart(metrics.email.dailyFailuresByCategory, topCategoryKeys)
    : [];
  const topCategoryLabels = metrics?.email.byFailureCategory.slice(0, 4).map((b) => b.label) ?? [];

  const trend = metrics?.email.qualityTrend;

  const applyPreset = (days: number) => {
    setDateFrom(startOfUtcDayYmd(days));
    setDateTo(toYmd(new Date()));
  };

  return (
    <section className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2 className="panel__title">Document processing metrics</h2>
          <p className="muted">
            Email OCR / Milo pipeline success and failure reasons when health documents are filed to pet profiles.
            Data from <code>processed_emails</code> and Milo vault (<code>pet_documents</code>).
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void loadMetrics()} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="directory__toolbar" style={{ marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <label>
          From{" "}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          To{" "}
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <button type="button" className="btn btn-secondary btn--sm" onClick={() => applyPreset(7)}>
          7 days
        </button>
        <button type="button" className="btn btn-secondary btn--sm" onClick={() => applyPreset(30)}>
          30 days
        </button>
        <button type="button" className="btn btn-secondary btn--sm" onClick={() => applyPreset(90)}>
          90 days
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <h3 className="chart-panel__title">Inbound email processing</h3>
      <div className="stat-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-card__label">Emails completed</div>
          <div className="stat-card__value">{loading ? "…" : (metrics?.email.totalCompleted ?? "—")}</div>
        </div>
        <div className="stat-card stat-card--teal">
          <div className="stat-card__label">Success rate</div>
          <div className="stat-card__value">
            {loading ? "…" : metrics ? `${metrics.email.successRate}%` : "—"}
          </div>
        </div>
        <div className="stat-card stat-card--accent">
          <div className="stat-card__label">Failed emails</div>
          <div className="stat-card__value">{loading ? "…" : (metrics?.email.totalFailed ?? "—")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Open Review Inbox</div>
          <div className="stat-card__value">{loading ? "…" : (metrics?.email.totalReviewInboxOpen ?? "—")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Stuck processing</div>
          <div className="stat-card__value">{loading ? "…" : (metrics?.email.totalStuckProcessing ?? "—")}</div>
        </div>
        {!loading && trend ? (
          <div className="stat-card stat-card--accent">
            <div className="stat-card__label">vs previous period</div>
            <div className="stat-card__value" style={{ fontSize: "1.1rem" }}>
              {trend.successRateDelta >= 0 ? "+" : ""}
              {trend.successRateDelta}% success
            </div>
            <div className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
              {trend.failedDelta <= 0 ? "" : "+"}
              {trend.failedDelta} failures · prior {formatUtcDate(trend.previousFrom)}–
              {formatUtcDate(trend.previousTo)}
            </div>
          </div>
        ) : null}
      </div>

      {onOpenMailErrors ? (
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          Drill into individual failures on{" "}
          <button type="button" className="btn-linkish" onClick={onOpenMailErrors}>
            Mail errors
          </button>
          .
        </p>
      ) : null}

      {!loading && metrics && metrics.email.byFailureCategory.length > 0 ? (
        <div className="chart-panel" style={{ marginTop: "1rem" }}>
          <h3 className="chart-panel__title">How to reduce current failures</h3>
          <ul className="muted" style={{ margin: 0, paddingLeft: "1.25rem", maxWidth: "52rem" }}>
            {metrics.email.byFailureCategory.some((b) => b.category === "configuration") ? (
              <li>
                <strong>Configuration:</strong> Set <code>Milo__InternalServiceKey</code> on PawBuck.API (same as Edge{" "}
                <code>MILO_INTERNAL_SERVICE_KEY</code>) and confirm <code>GET /api/health</code> →{" "}
                <code>miloAnalyzeInternalConfigured=true</code>.
              </li>
            ) : null}
            {metrics.email.byFailureCategory.some((b) => b.category === "gateway_timeout") ? (
              <li>
                <strong>504 timeouts:</strong> Edge now retries analyze-internal up to 3×; also raise ALB/ECS idle timeout
                if Milo vision runs longer than ~60s on large PDFs.
              </li>
            ) : null}
            {metrics.email.byFailureCategory.some((b) => b.category === "pet_no_identification") ? (
              <li>
                <strong>Missing pet ID:</strong> Filenames/subjects with the pet name (e.g. <code>For_Milo</code>) are now
                used when OCR misses the name; invoices without name/breed still need manual entry or re-send.
              </li>
            ) : null}
            {metrics.email.byFailureCategory.some((b) => b.category === "milo_extraction_failed") ? (
              <li>
                <strong>Extraction failed:</strong> Check document quality (scan resolution, rotation); use Milo classify
                harness on this tab’s Milo section to reproduce.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div className="chart-panel">
        <h3 className="chart-panel__title">Daily volume (UTC)</h3>
        {loading || !metrics ? (
          <p className="muted">Loading chart…</p>
        ) : dailyChartData.length === 0 ? (
          <p className="muted">No completed emails in this range.</p>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" width={36} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="succeeded"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ fill: "#0d9488", r: 3 }}
                  name="Succeeded"
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={{ fill: "#dc2626", r: 3 }}
                  name="Failed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="chart-panel">
        <h3 className="chart-panel__title">Failure categories over time (UTC)</h3>
        {loading || !metrics ? (
          <p className="muted">Loading…</p>
        ) : categoryTrendData.length === 0 ? (
          <p className="muted">No categorized failures in this range.</p>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={categoryTrendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" width={36} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Legend />
                {topCategoryLabels.map((label, i) => (
                  <Line
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    name={label}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="chart-panel">
        <h3 className="chart-panel__title">OCR / Milo failure reasons (by category)</h3>
        {loading || !metrics ? (
          <p className="muted">Loading…</p>
        ) : metrics.email.byFailureCategory.length === 0 ? (
          <p className="muted">No failures in this range.</p>
        ) : (
          <>
            <div className="chart-wrap" style={{ marginBottom: "1.25rem" }}>
              <ResponsiveContainer width="100%" height={Math.max(220, categoryChartData.length * 36)}>
                <BarChart data={categoryChartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={200}
                    tick={{ fontSize: 11 }}
                    stroke="#64748b"
                  />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="count" fill="#dc2626" name="Failures" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ overflowX: "auto", marginBottom: "1.25rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Count</th>
                    <th>% of failures</th>
                    <th>First seen</th>
                    <th>Last seen</th>
                    <th>What it means</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.email.byFailureCategory.map((row) => (
                    <tr key={row.category}>
                      <td>
                        <strong>{row.label}</strong>
                        <div className="muted" style={{ fontSize: "0.8rem" }}>
                          {row.category}
                        </div>
                      </td>
                      <td>{row.count}</td>
                      <td>{row.shareOfFailures}%</td>
                      <td>{formatUtcDate(row.firstSeenAt)}</td>
                      <td>{formatUtcDate(row.lastSeenAt)}</td>
                      <td className="muted">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="chart-panel">
        <h3 className="chart-panel__title">Top failure messages</h3>
        {loading || !metrics ? (
          <p className="muted">Loading…</p>
        ) : metrics.email.topFailureReasons.length === 0 ? (
          <p className="muted">No failure messages in this range.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Count</th>
                  <th>Category</th>
                  <th>First seen</th>
                  <th>Last seen</th>
                  <th>Failure reason (sample)</th>
                </tr>
              </thead>
              <tbody>
                {metrics.email.topFailureReasons.map((row) => (
                  <tr key={`${row.count}-${row.reason.slice(0, 40)}`}>
                    <td>{row.count}</td>
                    <td>{formatCategoryLabel(row.category)}</td>
                    <td>{formatUtcDate(row.firstSeenAt)}</td>
                    <td>{formatUtcDate(row.lastSeenAt)}</td>
                    <td style={{ maxWidth: 520, wordBreak: "break-word" }}>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="chart-panel">
        <h3 className="chart-panel__title">Success by document type (email)</h3>
        {loading || !metrics ? (
          <p className="muted">Loading…</p>
        ) : metrics.email.byDocumentType.length === 0 ? (
          <p className="muted">No data.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Document type</th>
                  <th>Succeeded</th>
                  <th>Failed</th>
                  <th>Success rate</th>
                </tr>
              </thead>
              <tbody>
                {metrics.email.byDocumentType.map((row) => (
                  <tr key={row.documentType || "(unset)"}>
                    <td>{row.documentType || "(unset)"}</td>
                    <td>{row.succeeded}</td>
                    <td>{row.failed}</td>
                    <td>{row.successRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h3 className="chart-panel__title" style={{ marginTop: "1.5rem" }}>
        Milo vault filing
      </h3>
      <p className="muted">
        Documents stored via analyze-internal after email or in-app upload, before clinical sync into vaccinations /
        medicines.
      </p>
      <div className="stat-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-card__label">Vault documents</div>
          <div className="stat-card__value">{loading ? "…" : (metrics?.vault.totalDocuments ?? "—")}</div>
        </div>
        <div className="stat-card stat-card--teal">
          <div className="stat-card__label">Clinical synced</div>
          <div className="stat-card__value">{loading ? "…" : (metrics?.vault.clinicalSynced ?? "—")}</div>
        </div>
        <div className="stat-card stat-card--accent">
          <div className="stat-card__label">Sync errors</div>
          <div className="stat-card__value">{loading ? "…" : (metrics?.vault.clinicalSyncErrors ?? "—")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Pending sync</div>
          <div className="stat-card__value">{loading ? "…" : (metrics?.vault.pendingClinicalSync ?? "—")}</div>
        </div>
      </div>

      {!loading && metrics && metrics.vault.byDocumentType.length > 0 ? (
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table>
            <thead>
              <tr>
                <th>Vault document type</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {metrics.vault.byDocumentType.map((row) => (
                <tr key={row.documentType || "(unset)"}>
                  <td>{row.documentType || "(unset)"}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
