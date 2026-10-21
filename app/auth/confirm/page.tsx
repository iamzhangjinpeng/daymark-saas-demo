"use client";

import { useEffect } from "react";
import { withBasePath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

function safeNextPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard/";
}

export default function ConfirmationPage() {
  useEffect(() => {
    async function confirmEmail() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      try {
        if (code && hasSupabaseConfig()) {
          const { error } = await createClient().auth.exchangeCodeForSession(code);
          if (!error) {
            window.location.replace(withBasePath(safeNextPath(params.get("next"))));
            return;
          }
        }
      } catch {
        // Route failures through the same recovery screen as invalid confirmation links.
      }

      window.location.replace(withBasePath("/login/?message=confirmation-error"));
    }

    void confirmEmail();
  }, []);

  return (
    <main className="setup-screen" aria-live="polite">
      <div className="setup-card"><span className="eyebrow">DAYMARK WORKSPACE</span><h1>Confirming your email…</h1></div>
    </main>
  );
}
