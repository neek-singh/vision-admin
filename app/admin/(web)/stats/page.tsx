import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import { updateStats } from "@/app/actions/web/stats";
import { ArrowLeft, BarChart3, Save } from "lucide-react";

export const unstable_instant = false;

export default async function ManageStatsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/unauthorized");

  // Load existing stats from JSON
  const statsFilePath = "c:\\Users\\as007\\vision-web\\features\\admin\\data\\stats.json";
  let stats = {
    expert_mentors: "10+",
    students_trained: "500+",
    practical_learning: "90%",
    courses_offered: "10+",
  };

  try {
    if (fs.existsSync(statsFilePath)) {
      stats = JSON.parse(fs.readFileSync(statsFilePath, "utf-8"));
    }
  } catch {}

  const fields = [
    { name: "expert_mentors", label: "Expert Mentors", value: stats.expert_mentors, placeholder: "e.g. 10+", hint: "Shown on homepage stats section" },
    { name: "students_trained", label: "Students Trained", value: stats.students_trained, placeholder: "e.g. 500+", hint: "Total alumni & current students" },
    { name: "practical_learning", label: "Practical Learning", value: stats.practical_learning, placeholder: "e.g. 90%", hint: "Hands-on curriculum percentage" },
    { name: "courses_offered", label: "Courses Offered", value: stats.courses_offered, placeholder: "e.g. 10+", hint: "Total active courses" },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft size={16} className="text-slate-600 dark:text-slate-400" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 size={18} className="text-orange-500" />
            Institute Stats
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Update key achievement metrics displayed on the website homepage
          </p>
        </div>
      </div>

      {/* Preview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {fields.map(f => (
          <div key={f.name} className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/10 p-3 rounded-2xl border border-orange-200/60 dark:border-orange-800/30 text-center">
            <p className="text-lg font-black text-orange-600 dark:text-orange-400">{f.value}</p>
            <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">{f.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm">
        <form action={updateStats} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {fields.map(f => (
              <div key={f.name} className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {f.label}
                </label>
                <input
                  required
                  name={f.name}
                  defaultValue={f.value}
                  placeholder={f.placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{f.hint}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-orange-500/20"
            >
              <Save size={14} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
