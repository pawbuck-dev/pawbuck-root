import { NavLink } from "react-router-dom";
import type { SupportQueuesSummary } from "@/types/support";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  badge?: number | null;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    "block rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
    isActive
      ? "border-l-[3px] border-teal-500 bg-teal-50 pl-[calc(0.625rem-3px)] text-teal-800"
      : "border-l-[3px] border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900",
  ].join(" ");
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
      {label}
    </span>
  );
}

type Props = {
  queues: SupportQueuesSummary | null;
  queuesLoading: boolean;
};

export function AdminSidebar({ queues, queuesLoading }: Props) {
  const reviewBadge = queuesLoading ? null : (queues?.reviewInboxOpen ?? 0);
  const opsBadge =
    queuesLoading || !queues || queues.opsAllReady ? null : queues.opsChecksFailing;

  const nav: NavGroup[] = [
    { label: "Home", items: [{ to: "/home", label: "Command center", end: true }] },
    {
      label: "Customers",
      items: [
        { to: "/customers/users", label: "Users" },
        { to: "/customers/pets", label: "Pets" },
      ],
    },
    {
      label: "Email pipeline",
      items: [
        { to: "/email/inbox", label: "Review inbox", badge: reviewBadge },
        { to: "/email/health", label: "Processing health" },
        {
          to: "/email/ops",
          label: "Email operations",
          badge: opsBadge,
        },
      ],
    },
    {
      label: "AI / Milo",
      items: [
        { to: "/milo/journal", label: "Journal & chat" },
        { to: "/milo/classify", label: "Classify lab" },
        { to: "/milo/adr", label: "Medication ADR" },
      ],
    },
    {
      label: "Product",
      items: [
        { to: "/product/subscriptions", label: "Subscriptions" },
        { to: "/product/gates", label: "Feature gates" },
        { to: "/product/verification", label: "Verification rules" },
        { to: "/product/document-sync", label: "Document sync" },
      ],
    },
  ];

  return (
    <aside
      className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-3 py-4"
      aria-label="Main navigation"
    >
      <nav className="space-y-4">
        {nav.map((group) => (
          <div key={group.label}>
            <div className="mb-1 px-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={navLinkClass}>
                    <span className="flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge != null ? <Badge count={item.badge} /> : null}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
