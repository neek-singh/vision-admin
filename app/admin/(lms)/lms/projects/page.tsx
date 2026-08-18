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
      courses(title),
      submissions:submissions(count)
    `)
    .order("created_at", { ascending: false });

  const { data: batchesData } = await supabase
    .from("batches")
    .select("title")
    .order("title");

  const batchNames = batchesData?.map(b => b.title) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500 font-medium">Create projects and track student submissions.</p>
        </div>
      </div>

      <ProjectsClient courses={courses || []} initialProjects={projects || []} availableBatches={batchNames} />
    </div>
  );
}
