import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import CoursesTableClient from "@/components/lms/courses/CoursesTableClient";

export const unstable_instant = false;

export default async function AdminCoursesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select(`
      *,
      enrollments:enrollments(count)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching courses for admin:", error);
  }

  const coursesList = courses || [];

  return (
    <div className="w-full space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen size={22} className="text-blue-600 dark:text-blue-400" />
              Manage Courses
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
              {coursesList.length} Courses
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your course catalog, categories, durations, fees, and student enrollments.
          </p>
        </div>

        <Link
          href="/admin/courses/new"
          id="btn-add-new-course"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus size={14} />
          <span>New Course</span>
        </Link>
      </div>

      <CoursesTableClient initialCourses={coursesList} />
    </div>
  );
}
