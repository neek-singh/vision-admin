import { createPublicSupabaseClient } from "@/lib/supabase-server";
import AttendanceClient from "@/app/admin/lms/attendance/AttendanceClient";

export default async function AttendancePage() {
  const supabase = createPublicSupabaseClient();

  // Fetch Courses
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Attendance Management</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Mark and manage daily student attendance records.</p>
        </div>
      </div>

      <AttendanceClient initialCourses={courses || []} />
    </div>
  );
}
