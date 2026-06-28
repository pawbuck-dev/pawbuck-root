import { Link } from "react-router-dom";
import { ApiAvailabilityPanel } from "@/components/ApiAvailabilityPanel";
import { RetentionJobsPanel } from "@/components/RetentionJobsPanel";
import { DashboardOverview } from "@/components/DashboardOverview";
import { SubscriptionOverviewPanel } from "@/components/SubscriptionOverviewPanel";
import { AdminGlobalSearch } from "@/components/AdminGlobalSearch";
import { useQueuesSummary, useSupportMetrics } from "@/hooks/supportQueries";
import type { SupportQueuesSummary } from "@/types/support";
import { PageHeader } from "@/ui/PageHeader";

type QueueLink = {
  to: string;
  title: string;
  desc: string;
  count?: (q: SupportQueuesSummary) => number;
};

const QUEUE_LINKS: QueueLink[] = [
  {
    to: "/email/inbox?tab=needs-action",
    title: "Review inbox",
    desc: "Emails that didn't become pet health records.",
    count: (q) => q.reviewInboxOpen,
  },
  {
    to: "/email/health",
    title: "Processing health",
    desc: "Pipeline volume and vault sync.",
    count: (q) => q.stuckProcessing,
  },
  {
    to: "/email/ops",
    title: "Email operations",
    desc: "Bulk reprocess and ops health.",
    count: (q) => (q.opsAllReady ? 0 : q.opsChecksFailing),
  },
  {
    to: "/customers/users",
    title: "User directory",
    desc: "Find accounts and open workspace.",
  },
  {
    to: "/customers/pets",
    title: "Pet health explorer",
    desc: "Search pets and health records.",
  },
  {
    to: "/product/subscriptions",
    title: "Subscriptions",
    desc: "Plan tiers, founding cap, and gates.",
  },
  {
    to: "/product/document-sync",
    title: "Document sync",
    desc: "Run clinical vault sync jobs.",
  },
];

export function CommandCenterPage() {
  const metricsQuery = useSupportMetrics();
  const queuesQuery = useQueuesSummary();
  const queues = queuesQuery.data;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Command center"
        description="Queues and metrics refresh every minute (or use Refresh in the header)."
      />
      <AdminGlobalSearch />

      <ApiAvailabilityPanel />

      <div className="my-6">
        <RetentionJobsPanel />
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Work queues">
        {QUEUE_LINKS.map((q) => {
          const n = queues && q.count ? q.count(queues) : 0;
          return (
            <Link
              key={q.to}
              to={q.to}
              className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 no-underline text-inherit transition-colors hover:border-teal-300"
            >
              <span className="flex items-center gap-2 font-semibold text-teal-800">
                {q.title}
                {n > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                    {n > 99 ? "99+" : n}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 text-sm text-slate-500">{q.desc}</span>
              <span className="mt-2 text-xs font-semibold text-blue-600">Open</span>
            </Link>
          );
        })}
      </section>

      {queues ? (
        <p className="muted mb-4 text-sm">
          Last 30 days: {queues.mailFailuresLast30Days} completed mail failures · Updated{" "}
          {new Date(queues.asOf).toLocaleString()}
        </p>
      ) : null}

      <DashboardOverview metrics={metricsQuery.data ?? null} loading={metricsQuery.isLoading} />

      <div style={{ marginTop: "1.5rem" }}>
        <SubscriptionOverviewPanel compact />
      </div>
    </div>
  );
}
