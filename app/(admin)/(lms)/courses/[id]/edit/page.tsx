import CourseForm from "@/components/lms/courses/CourseForm";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

export const unstable_instant = false;

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !course) {
    console.error("Error fetching course for edit:", error);
    return notFound();
  }

  return (
    <div className="w-full max-w-5xl space-y-4 pb-8">
      {/* ── Compact Header & Breadcrumbs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/courses"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
            title="Back to Courses"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600 dark:text-blue-400" />
                Edit Course
              </h1>
              {course.category && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                  {course.category}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Editing <span className="font-semibold text-slate-700 dark:text-slate-300">"{course.title}"</span>
            </p>
          </div>
        </div>
      </div>

      <CourseForm course={course} />
    </div>
  );
}

