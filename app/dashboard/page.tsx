import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { SetupState } from "@/components/setup-state";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  if (!hasSupabaseConfig()) return <SetupState />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("tasks")
    .select("id, user_id, title, description, status, priority, due_date, created_at, updated_at")
    .order("created_at", { ascending: false });

  return (
    <DashboardShell
      initialTasks={data ?? []}
      userEmail={user.email ?? ""}
      loadError={error?.message ?? ""}
    />
  );
}
