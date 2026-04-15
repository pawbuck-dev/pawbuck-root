import type { FormEvent } from "react";
import { useState } from "react";
import { authErrorHint, supabaseProjectHost } from "@/authUtils";
import { supabase } from "@/supabaseClient";

export function AdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const projectHost = supabaseProjectHost();
  const sb = supabase;

  if (!sb) {
    return (
      <div className="login-screen">
        <p className="login-screen__oops">Supabase is not configured.</p>
      </div>
    );
  }

  const authErrDetail = authErr ? authErrorHint(authErr) : null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthErr(null);
    setSubmitting(true);
    try {
      const { error } = await sb.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) setAuthErr(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__brand">
          <div className="login-card__logo" aria-hidden>
            PB
          </div>
          <div>
            <h1 className="login-card__title">PawBuck admin</h1>
            <p className="login-card__subtitle">Sign in to open the support console.</p>
          </div>
        </div>

        {projectHost ? (
          <p className="login-card__meta">
            <span className="login-card__meta-label">Project</span> {projectHost}
          </p>
        ) : null}

        <form className="login-card__form" onSubmit={(e) => void onSubmit(e)}>
          <label className="login-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>
          <label className="login-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {authErr ? <p className="login-card__error">{authErr}</p> : null}
          {authErrDetail ? <p className="login-card__hint">{authErrDetail}</p> : null}
          <button type="submit" className="btn login-card__submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
