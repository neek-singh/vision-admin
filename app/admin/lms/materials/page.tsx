
import { createServerSupabaseClient } from "@/lib/supabase-server";
import MaterialsClient from "./MaterialsClient";
import fs from "fs";

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

  let batchesList: any[] = [];
  try {
    const batchesFilePath = "c:\\Users\\as007\\vision-web\\data\\batches.json";
    if (fs.existsSync(batchesFilePath)) {
      const fileData = fs.readFileSync(batchesFilePath, "utf-8");
      batchesList = JSON.parse(fileData);
    }
  } catch (e) {
    console.error("Error reading batches:", e);
  }
  const batchNames = Array.from(new Set(batchesList.map(b => b.type).filter(Boolean)));

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
