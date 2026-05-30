import { useState } from "react";
import { Link } from "react-router-dom";
import { SupportApiError } from "@/api/supportClient";
import { useAdminApp } from "@/context/AdminAppContext";
import type { SupportPetExplorerRow, SupportUserRow } from "@/types/support";

export function AdminGlobalSearch() {
  const { client, setBanner } = useAdminApp();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState<SupportUserRow[]>([]);
  const [pets, setPets] = useState<SupportPetExplorerRow[]>([]);

  const runSearch = async () => {
    const term = q.trim();
    if (term.length < 2) {
      setBanner("Enter at least 2 characters to search.");
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const [u, p] = await Promise.all([
        client.searchUsers(term),
        client.searchPets(term),
      ]);
      setUsers(u.slice(0, 8));
      setPets(p.slice(0, 8));
    } catch (e) {
      setUsers([]);
      setPets([]);
      setBanner(e instanceof SupportApiError ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel global-search">
      <h3 className="panel-sub">Global search</h3>
      <div className="global-search__row">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="User email or pet name"
          aria-label="Search users and pets"
          onKeyDown={(e) => {
            if (e.key === "Enter") void runSearch();
          }}
        />
        <button type="button" className="btn" disabled={busy} onClick={() => void runSearch()}>
          {busy ? "Searching…" : "Search"}
        </button>
      </div>
      {(users.length > 0 || pets.length > 0) && (
        <div className="global-search__results">
          {users.length > 0 ? (
            <div>
              <div className="muted global-search__label">Users</div>
              <ul className="global-search__list">
                {users.map((u) => (
                  <li key={u.id}>
                    <Link to={`/customers/users/${u.id}`} state={{ user: u }}>
                      {u.email ?? u.id}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {pets.length > 0 ? (
            <div>
              <div className="muted global-search__label">Pets</div>
              <ul className="global-search__list">
                {pets.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/customers/users/${p.userId}`}
                      state={{
                        user: {
                          id: p.userId,
                          email: p.ownerEmail,
                          createdAt: null,
                        },
                      }}
                    >
                      {p.name} · {p.ownerEmail ?? "owner"}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
