import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { createSupportClient } from "@/api/supportClient";

type AdminAppContextValue = {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  session: Session | null;
  client: ReturnType<typeof createSupportClient>;
  banner: string | null;
  setBanner: (msg: string | null) => void;
};

const AdminAppContext = createContext<AdminAppContextValue | null>(null);

export function AdminAppProvider({
  baseUrl,
  onBaseUrlChange,
  session,
  children,
}: {
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  session: Session | null;
  children: ReactNode;
}) {
  const [banner, setBanner] = useState<string | null>(null);

  const client = useMemo(
    () => createSupportClient(baseUrl, () => session?.access_token ?? ""),
    [baseUrl, session],
  );

  const value = useMemo(
    () => ({
      baseUrl,
      setBaseUrl: onBaseUrlChange,
      session,
      client,
      banner,
      setBanner,
    }),
    [baseUrl, onBaseUrlChange, session, client, banner],
  );

  return <AdminAppContext.Provider value={value}>{children}</AdminAppContext.Provider>;
}

export function useAdminApp(): AdminAppContextValue {
  const ctx = useContext(AdminAppContext);
  if (!ctx) throw new Error("useAdminApp must be used within AdminAppProvider");
  return ctx;
}
