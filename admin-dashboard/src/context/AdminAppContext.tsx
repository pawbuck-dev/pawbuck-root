import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSupportClient, SupportApiError } from "@/api/supportClient";
import type { SupportMetrics } from "@/types/support";
import { isBrowserMixedContentApi } from "@/utils/adminApp";

type AdminAppContextValue = {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  session: Session | null;
  client: ReturnType<typeof createSupportClient>;
  banner: string | null;
  setBanner: (msg: string | null) => void;
  metrics: SupportMetrics | null;
  metricsLoading: boolean;
  loadMetrics: () => Promise<void>;
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
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const client = useMemo(
    () => createSupportClient(baseUrl, () => session?.access_token ?? ""),
    [baseUrl, session],
  );

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setBanner(null);
    try {
      setMetrics(await client.getMetrics());
    } catch (e) {
      setMetrics(null);
      const httpsAdmin =
        typeof window !== "undefined" && window.location.protocol === "https:";
      if (e instanceof SupportApiError) {
        setBanner(e.message);
      } else if (isBrowserMixedContentApi(httpsAdmin, baseUrl)) {
        setBanner(
          "Browser blocked the request: this admin page is HTTPS but the API URL is HTTP (mixed content). Point the API field to an https:// URL, or run the admin locally over HTTP for development.",
        );
      } else {
        setBanner(e instanceof Error && e.message ? e.message : "Failed to load metrics");
      }
    } finally {
      setMetricsLoading(false);
    }
  }, [client, baseUrl]);

  const value = useMemo(
    () => ({
      baseUrl,
      setBaseUrl: onBaseUrlChange,
      session,
      client,
      banner,
      setBanner,
      metrics,
      metricsLoading,
      loadMetrics,
    }),
    [
      baseUrl,
      onBaseUrlChange,
      session,
      client,
      banner,
      metrics,
      metricsLoading,
      loadMetrics,
    ],
  );

  return <AdminAppContext.Provider value={value}>{children}</AdminAppContext.Provider>;
}

export function useAdminApp(): AdminAppContextValue {
  const ctx = useContext(AdminAppContext);
  if (!ctx) throw new Error("useAdminApp must be used within AdminAppProvider");
  return ctx;
}
