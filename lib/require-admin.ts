import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", user.id)
    .single();

  if (error || profile?.role !== "admin" || profile?.is_blocked) {
    throw new Error("Forbidden");
  }

  return { supabase, user };
}
