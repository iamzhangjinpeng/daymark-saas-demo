"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { SetupState } from "@/components/setup-state";
import { withBasePath } from "@/lib/routes";

type PasswordRecoveryProps = { mode: "request" | "update" };

export function PasswordRecovery({ mode }: PasswordRecoveryProps) {
  const configured = hasSupabaseConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isReady, setIsReady] = useState(mode === "request");
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (mode !== "update" || !configured) return;

    let cancelled = false;
    async function loadRecoverySession() {
      const supabase = createClient();
      const code = new URLSearchParams(window.location.search).get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        window.history.replaceState(null, "", window.location.pathname);
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasRecoverySession(Boolean(data.session) && !sessionError);
      setIsReady(true);
    }

    void loadRecoverySession().catch(() => {
      if (cancelled) return;
      setHasRecoverySession(false);
      setIsReady(true);
    });

    return () => { cancelled = true; };
  }, [configured, mode]);

  if (!configured) return <SetupState />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsPending(true);

    try {
      const supabase = createClient();
      if (mode === "request") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}${withBasePath("/auth/recovery/")}`,
        });

        if (resetError) {
          setError("We couldn’t send a reset link right now. Check your connection and try again.");
        } else {
          setNotice("If an account matches that email, a password reset link is on its way.");
        }
        return;
      }

      if (!hasRecoverySession) {
        setError("This reset link is invalid or has expired. Request a new one to continue.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Those passwords don’t match. Please try again.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setCompleted(true);
    } catch {
      setError("We couldn’t connect to Daymark. Check your connection and try again.");
    } finally {
      setIsPending(false);
    }
  }

  const isUpdate = mode === "update";

  return (
    <main className="setup-screen">
      <section className="setup-card recovery-card" aria-labelledby="recovery-title">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark"><Sparkles size={17} strokeWidth={2.4} /></span>
          <span>daymark</span>
        </Link>
        <span className="eyebrow">ACCOUNT ACCESS</span>
        <h1 id="recovery-title">{isUpdate ? "Choose a new password." : "Let’s get you back in."}</h1>
        <p className="setup-intro">
          {isUpdate ? "Choose a new password for your Daymark account." : "Enter your account email and we’ll send a secure password reset link."}
        </p>

        {error && <div className="form-alert form-alert-error" role="alert">{error}</div>}
        {notice && <div className="form-alert form-alert-success" role="status">{notice}</div>}

        {!isUpdate && !notice && (
          <form className="recovery-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="recovery-email">Email address</label>
            <input className="text-field" id="recovery-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            <button className="button button-primary" type="submit" disabled={isPending}>
              {isPending ? "Sending link…" : "Send reset link"} <ArrowRight size={16} />
            </button>
          </form>
        )}

        {isUpdate && !isReady && <p className="recovery-state" role="status">Checking your reset link…</p>}
        {isUpdate && isReady && !hasRecoverySession && <p className="recovery-state" role="status">This reset link is invalid or has expired. Request a new one to continue.</p>}
        {isUpdate && isReady && hasRecoverySession && !completed && (
          <form className="recovery-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="new-password">New password</label>
            <input className="text-field" id="new-password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
            <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
            <input className="text-field" id="confirm-password" type="password" autoComplete="new-password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            <button className="button button-primary" type="submit" disabled={isPending}>
              {isPending ? "Updating password…" : "Update password"} <ArrowRight size={16} />
            </button>
          </form>
        )}

        {isUpdate && completed && (
          <div className="recovery-complete">
            <p className="form-alert form-alert-success" role="status">Your password has been updated.</p>
            <Link className="button button-primary" href="/dashboard/">Continue to your workspace <ArrowRight size={16} /></Link>
          </div>
        )}

        {isUpdate && isReady && !hasRecoverySession && (
          <Link className="button button-quiet recovery-retry" href="/forgot-password/">Request a new reset link</Link>
        )}

        <div className="auth-switch">
          Remembered your password? <Link href="/login/">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
