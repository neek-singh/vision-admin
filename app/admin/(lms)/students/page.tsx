import { createServerSupabaseClient } from "@/lib/supabase-server";
import StudentTable from "@/components/lms/students/StudentTable";
import { UserPlus } from "lucide-react";

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
    dbQuery = dbQuery.or(`name.ilike.%${query}%,student_id.ilike.%${query}%`);
  }

  const { data: students, error } = await dbQuery;

  if (error) {
    console.error("Error fetching students:", error);
  }

  // Fetch completed lessons count per student
  const { data: progressData } = await supabase
    .from("lesson_progress")
    .select("student_id, is_completed")
    .eq("is_completed", true);

  // Fetch active study time per student
  const { data: activityData } = await supabase
    .from("student_daily_activity")
    .select("student_id, active_seconds");

  // Fetch quiz/test results per student
  const { data: quizData } = await supabase
    .from("test_results")
    .select(`
      student_id,
      score,
      total_questions,
      completed_at,
      tests (
        title
      )
    `);

  // Map progress, activity and quizzes by student_id
  const lessonsCompletedMap: Record<string, number> = {};
  progressData?.forEach(row => {
    if (row.student_id) {
      lessonsCompletedMap[row.student_id] = (lessonsCompletedMap[row.student_id] || 0) + 1;
    }
  });

  const activeTimeMap: Record<string, number> = {};
  activityData?.forEach(row => {
    if (row.student_id) {
      activeTimeMap[row.student_id] = (activeTimeMap[row.student_id] || 0) + (row.active_seconds || 0);
    }
  });

  const quizResultsMap: Record<string, any[]> = {};
  quizData?.forEach(row => {
    if (row.student_id) {
      if (!quizResultsMap[row.student_id]) {
        quizResultsMap[row.student_id] = [];
      }
      quizResultsMap[row.student_id].push({
        testTitle: (row.tests as any)?.title || "Unnamed Quiz",
        score: row.score,
        totalQuestions: row.total_questions,
        completedAt: row.completed_at
      });
    }
  });

  const studentsWithLMSData = (students || []).map(student => {
    const totalSeconds = activeTimeMap[student.id] || 0;
    const completedLessons = lessonsCompletedMap[student.id] || 0;
    const quizzes = quizResultsMap[student.id] || [];

    return {
      ...student,
      lmsStats: {
        completedLessons,
        activeSeconds: totalSeconds,
        quizzes
      }
    };
  });

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
    <div className="container mx-auto sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Manage Students</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">View, edit, assign courses, and generate badges for students.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <a
            href="/admin/students/add"
            className="w-full md:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-2xl text-sm font-black transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            <span>Add Student</span>
          </a>
        </div>
      </div>

      <StudentTable 
        initialStudents={studentsWithLMSData} 
        availableBatches={batchNames} 
        availableCourses={courses}
      />
    </div>
  );
}

