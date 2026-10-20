"use client";

import { useEffect } from "react";
import { SetupState } from "@/components/setup-state";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { withBasePath } from "@/lib/routes";

export default function HomePage() {
  useEffect(() => {
    if (!hasSupabaseConfig()) return;

    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      window.location.replace(withBasePath(user ? "/dashboard/" : "/login/"));
    });
  }, []);

  if (!hasSupabaseConfig()) return <SetupState />;

  return (
    <main className="setup-screen" aria-live="polite">
      <div className="setup-card">
        <span className="eyebrow">YOUR DAYMARK WORKSPACE</span>
        <h1>Opening your workspace…</h1>
      </div>
    </main>
  );
}
