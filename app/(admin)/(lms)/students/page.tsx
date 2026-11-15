import { createServerSupabaseClient } from "@/lib/supabase-server";
import StudentTable from "@/components/lms/students/StudentTable";
import { UserPlus, UserCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export const unstable_instant = false;

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const params = await searchParams;
  const query = params.query || "";

  const supabase = await createServerSupabaseClient();

  let dbQuery = supabase
    .from("students")
    .select(`
      *,
      enrollments(
        id,
        batch,
        courses(id, title, course_code)
      )
    `)
    .order("created_at", { ascending: false });

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,student_id.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
  }

  const { data: students, error } = await dbQuery;

  if (error) {
    console.error("Error fetching students:", error);
  }

  const allStudents = students || [];
  // Separate unadmitted pre-admission users from regular enrolled students
  const unadmittedStudents = allStudents.filter(
    (s) => s.status === "unadmitted" || s.status === "pending"
  );
  const enrolledStudents = allStudents.filter(
    (s) => s.status !== "unadmitted" && s.status !== "pending"
  );

  // Fetch batches from Supabase
  const { data: batchesData } = await supabase
    .from("batches")
    .select("title")
    .order("title");

  const batchNames = batchesData?.map(b => b.title) || [];

  // Fetch courses from Supabase
  const { data: coursesData } = await supabase
    .from("courses")
    .select("id, title, course_code")
    .order("title");

  const courses = coursesData || [];

  return (
    <div className="w-full space-y-3.5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Manage Students
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
              {enrolledStudents.length} Enrolled Students
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View, edit, assign courses, and generate badges for regular enrolled students.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admissions?tab=registered"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all"
          >
            <UserCheck size={14} className="text-blue-600 dark:text-blue-400" />
            <span>Pre-Admissions</span>
            {unadmittedStudents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                {unadmittedStudents.length}
              </span>
            )}
          </Link>

          <Link
            href="/students/add"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl shadow-2xs hover:shadow-xs transition-all active:scale-[0.98]"
          >
            <UserPlus size={14} />
            <span>Add Student</span>
          </Link>
        </div>
      </div>

      {/* ── Pre-Admission Notification Banner ── */}
      {unadmittedStudents.length > 0 && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <UserCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {unadmittedStudents.length} Pre-Admission Registered User{unadmittedStudents.length > 1 ? "s" : ""} Awaiting Admission
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Self-registered students are kept separated from regular enrolled batches until admission is finalized.
              </p>
            </div>
          </div>
          <Link
            href="/admissions?tab=registered"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors shadow-2xs shrink-0"
          >
            <span>Review &amp; Enroll Users</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      <StudentTable 
        initialStudents={enrolledStudents} 
        availableBatches={batchNames} 
        availableCourses={courses}
      />
    </div>
  );
}
