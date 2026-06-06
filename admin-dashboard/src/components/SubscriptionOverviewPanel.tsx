import { Link } from "react-router-dom";
import {
  supportQueryErrorMessage,
  useSubscriptionPlanBreakdown,
} from "@/hooks/supportQueries";
import type { SubscriptionPlanBreakdownResponse } from "@/types/support";
import { formatSubscriptionPlanLabel } from "@/utils/adminApp";

type Props = {
  compact?: boolean;
};

const TIER_ORDER = ["free", "individual", "family"];

function sortedTiers(breakdown: SubscriptionPlanBreakdownResponse) {
  return [...breakdown.tiers].sort(
    (a, b) => TIER_ORDER.indexOf(a.plan) - TIER_ORDER.indexOf(b.plan),
  );
}

export function SubscriptionOverviewPanel({ compact = false }: Props) {
  const query = useSubscriptionPlanBreakdown();
  const breakdown = query.data;
  const loading = query.isLoading;
  const error = query.error ? supportQueryErrorMessage(query.error) : null;

  return (
    <section className={compact ? "panel panel--flush" : "panel panel--flush"} aria-label="Subscription plans">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="panel__title">{compact ? "Plans snapshot" : "Subscription overview"}</h2>
          {!compact ? (
            <p className="muted" style={{ maxWidth: "42rem" }}>
              Counts from <code>auth.users</code> joined to <code>user_entitlements</code>. Free is the default when no
              row exists. Founding members count toward Individual tier limits in the app.
            </p>
          ) : null}
        </div>
        {compact ? (
          <Link to="/product/subscriptions" className="text-sm font-semibold text-blue-600 no-underline hover:underline">
            Full breakdown
          </Link>
        ) : null}
      </div>

      {loading ? <p className="muted">Loading plan breakdown…</p> : null}
      {error ? <div className="error">{error}</div> : null}

      {breakdown ? (
        <>
          <div className="stat-grid" style={{ marginTop: "1rem" }}>
            <div className="stat-card stat-card--primary">
              <div className="stat-card__label">Total users</div>
              <div className="stat-card__value">{breakdown.totalUsers}</div>
            </div>
            <div className="stat-card stat-card--accent">
              <div className="stat-card__label">Founding members</div>
              <div className="stat-card__value">
                {breakdown.foundingMembers}
                <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 400 }}>
                  {" "}
                  / 500 cap
                </span>
              </div>
            </div>
            {!compact ? (
              <>
                <div className="stat-card stat-card--teal">
                  <div className="stat-card__label">No entitlement row</div>
                  <div className="stat-card__value">{breakdown.usersWithoutEntitlementRow}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">Expired paid</div>
                  <div className="stat-card__value">{breakdown.expiredPaidSubscriptions}</div>
                </div>
              </>
            ) : null}
          </div>

          <div className="table-scroll" style={{ marginTop: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Users</th>
                  <th>Founding in tier</th>
                  {!compact ? <th>Share</th> : null}
                </tr>
              </thead>
              <tbody>
                {sortedTiers(breakdown).map((t) => (
                  <tr key={t.plan}>
                    <td>{formatSubscriptionPlanLabel(t.plan)}</td>
                    <td>{t.userCount}</td>
                    <td>{t.foundingMembers}</td>
                    {!compact ? (
                      <td className="muted">
                        {breakdown.totalUsers > 0
                          ? `${Math.round((t.userCount / breakdown.totalUsers) * 100)}%`
                          : "—"}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="muted text-sm" style={{ marginTop: "0.75rem" }}>
            As of {new Date(breakdown.asOf).toLocaleString()}
          </p>
        </>
      ) : null}
    </section>
  );
}
