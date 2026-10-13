import CourseForm from "@/components/lms/courses/CourseForm";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function NewCoursePage() {
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
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600 dark:text-blue-400" />
              Add New Course
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Create a new course offering for Vision IT Computer Institute
            </p>
          </div>
        </div>
      </div>

      <CourseForm />
    </div>
  );
}

