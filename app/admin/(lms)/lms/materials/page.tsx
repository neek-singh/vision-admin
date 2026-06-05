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
    .select("title")
    .order("title");

  const batchNames = batchesData?.map(b => b.title) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notes & Materials</h1>
          <p className="text-sm text-slate-500 font-medium">Manage course-specific documents and videos.</p>
        </div>
      </div>

      <MaterialsClient courses={courses || []} initialMaterials={materials || []} availableBatches={batchNames} />
    </div>
  );
}
