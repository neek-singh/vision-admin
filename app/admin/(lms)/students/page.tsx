import { createServerSupabaseClient } from "@/lib/supabase-server";
import StudentTable from "@/components/lms/students/StudentTable";
import { UserPlus } from "lucide-react";
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
              {students?.length || 0} Students
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View, edit, assign courses, and generate badges for students.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/students/add"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl shadow-2xs hover:shadow-xs transition-all active:scale-[0.98]"
          >
            <UserPlus size={14} />
            <span>Add Student</span>
          </Link>
        </div>
      </div>

      <StudentTable 
        initialStudents={students || []} 
        availableBatches={batchNames} 
        availableCourses={courses}
      />
    </div>
  );
}
