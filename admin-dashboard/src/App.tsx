import type { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AdminLoginScreen } from "@/components/AdminLoginScreen";
import { AdminAppProvider } from "@/context/AdminAppContext";
import { AdminRoutes } from "@/routes";
import { isSupabaseConfigured, supabase } from "@/supabaseClient";
import { resolveAdminApiBase } from "@/utils/adminApp";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function App() {
  const [baseUrl, setBaseUrl] = useState(resolveAdminApiBase);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setAuthReady(true);
      return;
    }
    void supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
      })
      .finally(() => {
        setAuthReady(true);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <div className="login-screen login-screen--loading">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (isSupabaseConfigured && !session) {
    return <AdminLoginScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AdminAppProvider baseUrl={baseUrl} onBaseUrlChange={setBaseUrl} session={session}>
        <BrowserRouter>
          <AdminRoutes />
        </BrowserRouter>
      </AdminAppProvider>
    </QueryClientProvider>
  );
}
