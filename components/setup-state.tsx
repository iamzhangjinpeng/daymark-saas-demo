import Link from "next/link";
import { ArrowUpRight, CircleCheck, Database, KeyRound, Sparkles } from "lucide-react";

export function SetupState() {
  return (
    <main className="setup-screen">
      <div className="setup-card">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark"><Sparkles size={17} strokeWidth={2.4} /></span>
          <span>daymark</span>
        </Link>
        <span className="eyebrow">ONE LAST CONNECTION</span>
        <h1>Your workspace is ready to connect.</h1>
        <p className="setup-intro">
          Daymark uses Supabase for real accounts and private task storage. Add your project keys and database schema to turn on sign in.
        </p>
        <div className="setup-checklist">
          <div><span className="setup-step"><KeyRound size={15} /></span><span><strong>Add project keys</strong><small>Copy the URL and publishable key into <code>.env.local</code>.</small></span></div>
          <div><span className="setup-step"><Database size={15} /></span><span><strong>Create your tasks table</strong><small>Run <code>supabase/schema.sql</code> in the Supabase SQL Editor.</small></span></div>
          <div><span className="setup-step"><CircleCheck size={15} /></span><span><strong>Start the app</strong><small>Run <code>npm run dev</code>, then create your account.</small></span></div>
        </div>
        <a className="setup-link" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
          Open Supabase dashboard <ArrowUpRight size={16} />
        </a>
        <p className="setup-footnote">No demo account or sample records are used. Every task belongs to the signed-in user.</p>
      </div>
    </main>
  );
}
