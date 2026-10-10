import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import UsersClient from "@/components/system/UsersClient";

export const unstable_instant = false;

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/unauthorized");

  // Query unified system users view
  let { data: users, error } = await supabase
    .from("system_users_overview")
    .select("*")
    .order("created_at", { ascending: false });

  // Fallback in case the view is not cached yet
  if (error || !users || users.length === 0) {
    const { data: profilesList } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: studentsList } = await supabase
      .from("students")
      .select("id, student_id, name, email, phone");

    const studentMap = new Map((studentsList || []).map((s) => [s.id, s]));

    users = (profilesList || []).map((p) => {
      const s = studentMap.get(p.id);
      const isStudentOrApp = Boolean(s || p.roll_number);
      return {
        id: p.id,
        full_name: p.full_name || "New User",
        role: p.role || "student",
        email: s?.email || p.phone || "No email",
        phone: s?.phone || p.phone || "No phone",
        roll_number: s?.student_id || p.roll_number || null,
        platform: p.role === "admin" ? "admin" : (isStudentOrApp ? "app" : "website"),
        is_blocked: Boolean(p.is_blocked),
        blocked_at: p.blocked_at || null,
        blocked_reason: p.blocked_reason || null,
        created_at: p.created_at,
        updated_at: p.updated_at
      };
    });
  }

  return (
    <div className="w-full">
      <UsersClient 
        initialUsers={users || []} 
        currentAdminId={user.id} 
      />
    </div>
  );
}
