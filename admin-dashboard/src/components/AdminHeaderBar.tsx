import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/supabaseClient";

type AdminHeaderBarProps = {
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  session: Session | null;
  onRefresh: () => void;
};

export function AdminHeaderBar({ baseUrl, onBaseUrlChange, session, onRefresh }: AdminHeaderBarProps) {
  const sb = supabase;

  return (
    <header className="admin-header">
      <div className="admin-header__main">
        <div className="admin-header__title-block">
          <h1 className="admin-header__title">PawBuck admin</h1>
          {!isSupabaseConfigured ? (
            <span className="admin-header__badge" title="PawBuck.API Development mode may allow support routes without a Bearer token">
              Local / dev
            </span>
          ) : null}
        </div>

        <label className="admin-header__api">
          <span className="admin-header__api-label">API</span>
          <input
            id="base"
            value={baseUrl}
            onChange={(e) => onBaseUrlChange(e.target.value.replace(/\/$/, ""))}
            autoComplete="off"
            spellCheck={false}
            placeholder="https://api.example.com (origin only — no /api/... path)"
          />
        </label>

        <div className="admin-header__actions">
          {isSupabaseConfigured && session?.user?.email ? (
            <div className="admin-header__user">
              <span className="admin-header__email" title={session.user.email}>
                {session.user.email}
              </span>
              <button type="button" className="btn btn-secondary btn--sm" onClick={() => void sb?.auth.signOut()}>
                Sign out
              </button>
            </div>
          ) : null}
          <button type="button" className="btn btn-secondary btn--sm" onClick={() => void onRefresh()}>
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}
