import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { updateStats } from "@/app/actions/web/stats";



async function getSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => { },
      },
    }
  );
}

export default async function ManageStatsPage() {
  const supabase = await getSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  // Load existing stats
  const statsFilePath = "c:\\Users\\as007\\vision-web\\features\\admin\\data\\stats.json";

  let stats = {
    expert_mentors: "10+",
    students_trained: "500+",
    practical_learning: "90%",
    courses_offered: "10+",
  };

  try {
    if (fs.existsSync(statsFilePath)) {
      const fileData = fs.readFileSync(statsFilePath, "utf-8");
      stats = JSON.parse(fileData);
    }
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#0f172a] p-6 sm:p-10 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/80 shadow-xl space-y-8">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-normal text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-blue-950 dark:text-white tracking-tight">Manage Institute Stats</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Update the key achievement metrics displayed on the website.</p>
        </div>

        <form action={updateStats} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expert Mentors</label>
              <input
                required
                name="expert_mentors"
                defaultValue={stats.expert_mentors}
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                placeholder="e.g. 10+"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Students Trained</label>
              <input
                required
                name="students_trained"
                defaultValue={stats.students_trained}
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                placeholder="e.g. 500+"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Practical Learning</label>
              <input
                required
                name="practical_learning"
                defaultValue={stats.practical_learning}
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                placeholder="e.g. 90%"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Courses Offered</label>
              <input
                required
                name="courses_offered"
                defaultValue={stats.courses_offered}
                className="w-full px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 text-sm font-normal"
                placeholder="e.g. 10+"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-850">
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-md cursor-pointer text-center hover:scale-[1.01] active:scale-[0.98]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
