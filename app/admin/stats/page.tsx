import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { updateStats } from "@/app/actions/stats";

export const revalidate = 0;

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
  const statsFilePath = "c:\\Users\\as007\\vision-web\\data\\stats.json";

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
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow border space-y-8">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-black text-blue-950">Manage Institute Stats</h1>
          <p className="text-gray-500 mt-2">Update the key achievement metrics displayed on the website.</p>
        </div>

        <form action={updateStats} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Expert Mentors</label>
              <input
                name="expert_mentors"
                defaultValue={stats.expert_mentors}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. 10+"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Students Trained</label>
              <input
                name="students_trained"
                defaultValue={stats.students_trained}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. 500+"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Practical Learning</label>
              <input
                name="practical_learning"
                defaultValue={stats.practical_learning}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. 90%"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Courses Offered</label>
              <input
                name="courses_offered"
                defaultValue={stats.courses_offered}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. 10+"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
          >
            Save Changes
          </button>
        </form>
      </div>
    </main>
  );
}
