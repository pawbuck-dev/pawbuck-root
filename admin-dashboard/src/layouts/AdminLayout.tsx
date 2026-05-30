import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AdminHeaderBar } from "@/components/AdminHeaderBar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminApp } from "@/context/AdminAppContext";
import {
  supportQueryErrorMessage,
  useInvalidateSupportQueries,
  useQueuesSummary,
  useSupportMetrics,
} from "@/hooks/supportQueries";
import { isBrowserMixedContentApi } from "@/utils/adminApp";

export function AdminLayout() {
  const { baseUrl, setBaseUrl, session, banner, setBanner } = useAdminApp();
  const invalidateSupport = useInvalidateSupportQueries();
  const metricsQuery = useSupportMetrics();
  const queuesQuery = useQueuesSummary();

  useEffect(() => {
    const err = metricsQuery.error ?? queuesQuery.error;
    if (err) {
      setBanner(supportQueryErrorMessage(err));
    }
  }, [metricsQuery.error, queuesQuery.error, setBanner]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <AdminHeaderBar
        baseUrl={baseUrl}
        onBaseUrlChange={setBaseUrl}
        session={session}
        onRefresh={() => invalidateSupport()}
      />

      {typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      isBrowserMixedContentApi(true, baseUrl) ? (
        <div className="banner-warn mx-4" role="status">
          <strong>Mixed content:</strong> this page is loaded over HTTPS, so the browser will not call an{" "}
          <code>http://</code> API. Set <strong>VITE_ADMIN_API_BASE</strong> to an <code>https://</code> API
          origin when you deploy the admin to CloudFront.
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <AdminSidebar queues={queuesQuery.data ?? null} queuesLoading={queuesQuery.isLoading} />
        <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-10 md:p-5">
          {banner ? (
            <div className="error mb-4 flex items-start justify-between gap-3">
              <span>{banner}</span>
              <button
                type="button"
                className="btn-linkish shrink-0"
                onClick={() => setBanner(null)}
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
