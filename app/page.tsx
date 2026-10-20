import { redirect } from "next/navigation";
import { SetupState } from "@/components/setup-state";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  if (!hasSupabaseConfig()) return <SetupState />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
