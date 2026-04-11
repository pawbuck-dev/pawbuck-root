import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useCallback, useEffect, useState } from "react";
import { createSupportClient, SupportApiError } from "@/api/supportClient";
import type { SupportUserDirectoryRow } from "@/types/support";

type Props = {
  client: ReturnType<typeof createSupportClient>;
  onSelectUser: (row: SupportUserDirectoryRow) => void;
  selectedId: string | null;
};

const columns: ColumnDef<SupportUserDirectoryRow>[] = [
  {
    accessorKey: "displayName",
    header: "Name",
    cell: ({ getValue }) => (getValue() as string)?.trim() || "—",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ getValue }) => (getValue() as string) ?? "—",
  },
  {
    accessorKey: "createdAt",
    header: "Registration",
    cell: ({ getValue }) => {
      const v = getValue() as string | null;
      if (!v) return "—";
      const d = v.slice(0, 10);
      return d.length === 10 ? d : v;
    },
  },
  {
    accessorKey: "petCount",
    header: "Pets",
    cell: ({ getValue }) => String(getValue() ?? 0),
  },
];

export function UserDirectoryTable({ client, onSelectUser, selectedId }: Props) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [data, setData] = useState<SupportUserDirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.getUserDirectory(debouncedQ, page, pageSize);
      setData(res.items);
      setTotal(res.totalCount);
    } catch (e) {
      setData([]);
      setTotal(0);
      setError(e instanceof SupportApiError ? e.message : "Failed to load directory");
    } finally {
      setLoading(false);
    }
  }, [client, debouncedQ, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="directory">
      <div className="directory__toolbar">
        <input
          className="directory__search"
          placeholder="Search name or email (server-side)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Filter users"
        />
        <span className="muted directory__count">
          {loading ? "Loading…" : `${total} user(s)`}
        </span>
      </div>
      {error ? <div className="error directory__err">{error}</div> : null}
      <div className="table-scroll directory__table">
        <table>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`clickable ${selectedId === row.original.id ? "selected" : ""}`}
                onClick={() => onSelectUser(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="directory__pager">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span className="muted">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={page >= pageCount || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
