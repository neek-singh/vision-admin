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
    <div className="container mx-auto px-6 lg:px-8 py-10 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Attendance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Mark and manage daily student attendance records.</p>
      </div>

      <AttendanceClient initialCourses={courses || []} initialBatches={batches || []} />
    </div>
  );
}


