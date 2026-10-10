"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function toggleBlockUser(
  userId: string,
  shouldBlock: boolean,
  reason: string = "Account suspended by administrator"
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized. Please log in." };
    }

    // Role verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { error: "Forbidden: Admin privileges required." };
    }

    // Protection: Cannot block yourself
    if (user.id === userId) {
      return { error: "Action prohibited: You cannot block your own administrative account." };
    }

    // 1. Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        is_blocked: shouldBlock,
        blocked_at: shouldBlock ? new Date().toISOString() : null,
        blocked_reason: shouldBlock ? reason.trim() || "Blocked by administrator" : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (profileError) throw profileError;

    // 2. Also update students table if student record exists
    await supabase
      .from("students")
      .update({
        is_blocked: shouldBlock
      })
      .eq("id", userId);

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    console.error("toggleBlockUser error:", err);
    return { error: err.message || "Failed to update user block status." };
  }
}

export async function updateUserRole(userId: string, newRole: "admin" | "student" | "staff") {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Unauthorized. Please log in." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { error: "Forbidden: Admin privileges required." };
    }

    if (user.id === userId && newRole !== "admin") {
      return { error: "Action prohibited: You cannot demote your own administrative account." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (error) throw error;

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    console.error("updateUserRole error:", err);
    return { error: err.message || "Failed to update user role." };
  }
}
