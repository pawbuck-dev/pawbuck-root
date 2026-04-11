import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SupportMetrics } from "@/types/support";

type Props = {
  metrics: SupportMetrics | null;
  loading: boolean;
};

export function DashboardOverview({ metrics, loading }: Props) {
  const chartData =
    metrics?.dailySignups?.map((d) => ({
      day: d.date.slice(5),
      signups: d.count,
    })) ?? [];

  return (
    <div className="overview">
      <div className="stat-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-card__label">Total users</div>
          <div className="stat-card__value">{loading ? "…" : (metrics?.totalUsers ?? "—")}</div>
        </div>
        <div className="stat-card stat-card--accent">
          <div className="stat-card__label">New registrations (7 days)</div>
          <div className="stat-card__value">{loading ? "…" : (metrics?.newUsersLast7Days ?? "—")}</div>
        </div>
        <div className="stat-card stat-card--teal">
          <div className="stat-card__label">Total pets</div>
          <div className="stat-card__value">{loading ? "…" : (metrics?.totalPets ?? "—")}</div>
        </div>
      </div>

      <div className="chart-panel">
        <h3 className="chart-panel__title">Daily sign-ups (last 14 days, UTC)</h3>
        {loading || !metrics ? (
          <p className="muted">Loading chart…</p>
        ) : chartData.length === 0 ? (
          <p className="muted">No data.</p>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" width={36} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ fill: "#0d9488", r: 3 }}
                  name="Sign-ups"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="muted overview__hint">
        Engagement: {loading ? "…" : `${metrics?.usersWithPets ?? "—"} users with a pet · ${metrics?.usersWithPetsAndHealthRecords ?? "—"} with health records`}
      </p>
    </div>
  );
}
