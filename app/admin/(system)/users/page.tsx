import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import UsersClient from "@/components/system/UsersClient";
import { Shield, Users, ShieldCheck, ShieldAlert } from "lucide-react";

export const unstable_instant = false;

export default async function AdminUsersPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/unauthorized");

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const list = users || [];
  const admins = list.filter(u => u.role === "admin");
  const staff = list.filter(u => u.role === "staff");
  const students = list.filter(u => u.role === "student");
  const others = list.filter(u => !["admin", "staff", "student"].includes(u.role));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Shield size={20} className="text-violet-500" />
            Manage Users
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            View and assign roles for all system users
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: list.length, icon: Users, color: "text-slate-600 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50" },
          { label: "Admins", value: admins.length, icon: ShieldCheck, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30 border-violet-200/60 dark:border-violet-800/30" },
          { label: "Staff", value: staff.length, icon: Shield, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-800/30" },
          { label: "Students", value: students.length, icon: ShieldAlert, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/30" },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 p-3.5 rounded-2xl border shadow-sm ${s.color}`}>
            <s.icon size={15} className="shrink-0" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 leading-none">{s.label}</p>
              <p className="text-xl font-black leading-tight mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Users Client Table */}
      <UsersClient initialUsers={list} />
    </div>
  );
}
