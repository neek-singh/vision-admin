import { createServerSupabaseClient } from "@/lib/supabase-server";
import MaterialsClient from "@/components/lms/materials/MaterialsClient";

export default async function MaterialsAdminPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  const { data: materials } = await supabase
    .from("materials")
    .select(`
      *,
      courses(title)
    `)
    .order("created_at", { ascending: false });

  const { data: batchesData } = await supabase
    .from("batches")
    .select("title, course_id")
    .order("title");

  const batchesList = batchesData || [];

  return (
    <div className="container mx-auto px-6 lg:px-8 py-10 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Notes &amp; Materials</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage course-specific documents and videos.</p>
      </div>

      <MaterialsClient courses={courses || []} initialMaterials={materials || []} availableBatches={batchesList} />
    </div>
  );
}
