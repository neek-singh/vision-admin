import { createServerSupabaseClient } from "@/lib/supabase-server";
import ProjectsClient from "@/components/lms/projects/ProjectsClient";

export default async function ProjectsAdminPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  // Keep querying 'assignments' table under the hood
  const { data: projects } = await supabase
    .from("assignments")
    .select(`
      *,
      assignment_courses(
        course_id,
        courses(title)
      ),
      submissions:submissions(count)
    `)
    .order("created_at", { ascending: false });

  const { data: batchesData } = await supabase
    .from("batches")
    .select("id, title, course_id")
    .order("title");

  return (
    <div className="container mx-auto px-6 lg:px-8 py-10 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Projects</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create projects and track student submissions.</p>
      </div>

      <ProjectsClient courses={courses || []} initialProjects={projects || []} availableBatches={batchesData || []} />
    </div>
  );
}
