
import { createServerSupabaseClient } from "@/lib/supabase-server";
import AssignmentsClient from "./AssignmentsClient";
import fs from "fs";

export default async function AssignmentsAdminPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  const { data: assignments } = await supabase
    .from("assignments")
    .select(`
      *,
      courses(title),
      submissions:submissions(count)
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Assignments</h1>
          <p className="text-sm text-slate-500 font-medium">Create tasks and track student submissions.</p>
        </div>
      </div>

      <AssignmentsClient courses={courses || []} initialAssignments={assignments || []} availableBatches={batchNames} />
    </div>
  );
}
