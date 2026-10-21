"use client";

import { useEffect, useState } from "react";
import { DashboardShell, type Task } from "@/components/dashboard-shell";
import { SetupState } from "@/components/setup-state";
import { withBasePath } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";

const taskFields = "id, user_id, title, description, status, priority, due_date, created_at, updated_at";

export default function DashboardPage() {
  const configured = hasSupabaseConfig();
  const [workspace, setWorkspace] = useState<{ tasks: Task[]; email: string; userId: string; error: string } | null>(null);
  const [loadFailure, setLoadFailure] = useState(false);

  useEffect(() => {
    if (!configured) return;

    let cancelled = false;
    const supabase = createClient();

    async function loadWorkspace() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionError) throw sessionError;
        if (!session) {
          window.location.replace(withBasePath("/login/"));
          return;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (cancelled) return;
        if (authError?.status === 401 || (!user && !authError)) {
          window.location.replace(withBasePath("/login/"));
          return;
        }
        if (authError) throw authError;
        if (!user) {
          window.location.replace(withBasePath("/login/"));
          return;
        }

        const { data, error } = await supabase
          .from("tasks")
          .select(taskFields)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!cancelled) {
          setWorkspace({
            tasks: (data ?? []) as Task[],
            email: user.email ?? "",
            userId: user.id,
            error: error?.message ?? "",
          });
        }
      } catch {
        if (!cancelled) setLoadFailure(true);
      }
    }

    void loadWorkspace();
    return () => { cancelled = true; };
  }, [configured]);

  if (!configured) return <SetupState />;
  if (loadFailure) {
    return (
      <main className="setup-screen" aria-live="polite">
        <div className="setup-card">
          <span className="eyebrow">DAYMARK WORKSPACE</span>
          <h1>Your workspace didn’t load.</h1>
          <p className="setup-intro">Check your connection, then try again. Your saved tasks are still in your account.</p>
          <button className="button button-primary" type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </main>
    );
  }
  if (!workspace) {
    return (
      <main className="setup-screen" aria-live="polite">
        <div className="setup-card"><span className="eyebrow">YOUR DAYMARK WORKSPACE</span><h1>Loading your tasks…</h1></div>
      </main>
    );
  }

  return <DashboardShell initialTasks={workspace.tasks} userEmail={workspace.email} userId={workspace.userId} loadError={workspace.error} />;
}
