import { Link } from "react-router-dom";
import { DashboardOverview } from "@/components/DashboardOverview";
import { AdminGlobalSearch } from "@/components/AdminGlobalSearch";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

const QUEUE_LINKS = [
  {
    to: "/email/inbox",
    title: "Review inbox",
    desc: "Triage failed or stuck inbound mail (consumer parity filters).",
  },
  {
    to: "/email/health",
    title: "Processing health",
    desc: "Pipeline volume, failure categories, vault sync.",
  },
  {
    to: "/email/ops",
    title: "Email operations",
    desc: "Bulk reprocess, ops health checks, tuning guide.",
  },
  {
    to: "/customers/users",
    title: "User directory",
    desc: "Find accounts and open the account workspace.",
  },
  {
    to: "/customers/pets",
    title: "Pet health explorer",
    desc: "Search pets and jump to health records.",
  },
  {
    to: "/product/document-sync",
    title: "Document sync",
    desc: "Run clinical vault sync jobs.",
  },
];

export function CommandCenterPage() {
  const { metrics, metricsLoading } = useAdminApp();

  return (
    <div className="page">
      <PageHeader
        title="Command center"
        description="Start here for daily support work. Metrics refresh from the header."
      />
      <AdminGlobalSearch />
      <section className="queue-grid" aria-label="Work queues">
        {QUEUE_LINKS.map((q) => (
          <Link key={q.to} to={q.to} className="queue-card">
            <span className="queue-card__title">{q.title}</span>
            <span className="queue-card__desc">{q.desc}</span>
            <span className="queue-card__action">Open</span>
          </Link>
        ))}
      </section>
      <DashboardOverview metrics={metrics} loading={metricsLoading} />
    </div>
  );
}
