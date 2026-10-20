"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type AuthFormProps = { mode: "login" | "signup" };

export function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const configured = hasSupabaseConfig();
  const [confirmationError, setConfirmationError] = useState(false);

  useEffect(() => {
    setConfirmationError(new URLSearchParams(window.location.search).get("message") === "confirmation-error");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!configured) {
      setError("Connect your Supabase project first. See the setup guide in the project README.");
      return;
    }

    setIsPending(true);
    const supabase = createClient();

    if (isSignup) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else if (data.session) {
        router.replace("/dashboard");
        router.refresh();
      } else {
        setNotice("Check your inbox for a confirmation link. Your workspace will be ready as soon as you confirm your email.");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        router.replace("/dashboard");
        router.refresh();
      }
    }

    setIsPending(false);
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="auth-story-top">
          <Link className="brand-lockup brand-lockup-light" href="/">
            <span className="brand-mark"><Sparkles size={17} strokeWidth={2.4} /></span>
            <span>daymark</span>
          </Link>
          <span className="story-label">A LITTLE MORE CLARITY</span>
        </div>
        <div className="story-copy">
          <div className="story-orbit orbit-one" />
          <div className="story-orbit orbit-two" />
          <div className="story-star"><Sparkles size={23} /></div>
          <p className="eyebrow story-eyebrow">MAKE ROOM FOR WHAT MATTERS</p>
          <h1>Good work<br /><em>starts with</em><br />a clear mind.</h1>
          <p className="story-description">A quiet place for your next step, your long game, and everything in between.</p>
          <div className="story-perks">
            <span><Check size={15} /> Your work, always yours</span>
            <span><Check size={15} /> Private by design</span>
          </div>
        </div>
        <div className="story-footer"><span>DAYMARK WORKSPACE</span><span>BUILT FOR YOUR EVERYDAY</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-top">
          <span>{isSignup ? "START FRESH" : "WELCOME BACK"}</span>
          <span className="secure-label"><LockKeyhole size={13} /> SECURE SIGN IN</span>
        </div>
        <div className="auth-card">
          <span className="auth-kicker">{isSignup ? "YOUR NEXT CHAPTER" : "PICK UP WHERE YOU LEFT OFF"}</span>
          <h2>{isSignup ? "Create your account" : "Sign in to Daymark"}</h2>
          <p className="auth-subtitle">{isSignup ? "A little space to think clearly and move forward." : "Your work is right where you left it."}</p>

          {confirmationError && <div className="form-alert form-alert-error" role="alert">That confirmation link could not be verified. Try signing in or request a new sign-up link.</div>}
          {error && <div className="form-alert form-alert-error" role="alert">{error}</div>}
          {notice && <div className="form-alert form-alert-success" role="status">{notice}</div>}

          <form className="auth-fields" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="email">Email address</label>
            <div className="input-wrap">
              <Mail size={17} aria-hidden="true" />
              <input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>

            <div className="password-label-row">
              <label className="field-label" htmlFor="password">Password</label>
              <span className="password-hint">At least 6 characters</span>
            </div>
            <div className="input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input id="password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
              <button className="input-action" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>

            <button className="button button-primary auth-submit" type="submit" disabled={isPending || !configured}>
              {isPending ? <><LoaderCircle className="spin" size={17} /> {isSignup ? "Creating account…" : "Signing in…"}</> : <>{isSignup ? "Create account" : "Sign in"}<ArrowRight size={17} /></>}
            </button>
            {!configured && <p className="form-note">Supabase is not connected yet. Add the two environment variables from <code>.env.example</code>.</p>}
          </form>

          <div className="auth-switch">
            {isSignup ? "Already have an account?" : "New to Daymark?"} <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link>
          </div>
          <div className="auth-divider"><span /> <small>YOUR SPACE, YOUR PACE</small> <span /></div>
          <p className="auth-privacy">By continuing, you agree to keep your workspace yours. We never share your tasks.</p>
        </div>
        <div className="auth-bottom"><Link href="/">DAYMARK</Link><span>THOUGHTFUL WORK, EVERY DAY</span></div>
      </section>
    </main>
  );
}
