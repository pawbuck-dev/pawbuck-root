import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AdminHeaderBar } from "@/components/AdminHeaderBar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAdminApp } from "@/context/AdminAppContext";
import { isBrowserMixedContentApi } from "@/utils/adminApp";

export function AdminLayout() {
  const { baseUrl, setBaseUrl, session, banner, setBanner, loadMetrics } = useAdminApp();

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="admin-app">
      <AdminHeaderBar
        baseUrl={baseUrl}
        onBaseUrlChange={setBaseUrl}
        session={session}
        onRefresh={() => void loadMetrics()}
      />

      {typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      isBrowserMixedContentApi(true, baseUrl) ? (
        <div className="banner-warn admin-app__banner" role="status">
          <strong>Mixed content:</strong> this page is loaded over HTTPS, so the browser will not call an{" "}
          <code>http://</code> API. Set <strong>VITE_ADMIN_API_BASE</strong> to an <code>https://</code> API
          origin when you deploy the admin to CloudFront.
        </div>
      ) : null}

      <div className="admin-app__body">
        <AdminSidebar />
        <main className="admin-app__main">
          {banner ? (
            <div className="error admin-app__error">
              {banner}
              <button
                type="button"
                className="btn-linkish admin-app__error-dismiss"
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
