import { createPublicSupabaseClient } from "@/lib/supabase-server";
import AttendanceClient from "@/components/lms/attendance/AttendanceClient";

export default async function AttendancePage() {
  const supabase = createPublicSupabaseClient();

  // Fetch Courses
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  // Fetch Batches
  const { data: batches } = await supabase
    .from("batches")
    .select("id, title, course_id")
    .order("title");

  return (
    <div className="container mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-5xl space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Daily Attendance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Mark and manage daily student attendance records.
          </p>
        </div>
      </div>

      <AttendanceClient initialCourses={courses || []} initialBatches={batches || []} />
    </div>
  );
}


