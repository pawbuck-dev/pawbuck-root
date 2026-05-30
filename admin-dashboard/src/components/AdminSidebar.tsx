import { NavLink } from "react-router-dom";

type NavItem = { to: string; label: string; end?: boolean };

type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
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
      { to: "/email/inbox", label: "Review inbox" },
      { to: "/email/health", label: "Processing health" },
      { to: "/email/ops", label: "Email operations" },
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
      { to: "/product/gates", label: "Feature gates" },
      { to: "/product/verification", label: "Verification rules" },
      { to: "/product/document-sync", label: "Document sync" },
    ],
  },
];

export function AdminSidebar() {
  return (
    <aside className="admin-sidebar" aria-label="Main navigation">
      <nav className="admin-sidebar__nav">
        {NAV.map((group) => (
          <div key={group.label} className="admin-sidebar__group">
            <div className="admin-sidebar__group-label">{group.label}</div>
            <ul className="admin-sidebar__list">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      isActive ? "admin-sidebar__link admin-sidebar__link--active" : "admin-sidebar__link"
                    }
                  >
                    {item.label}
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
