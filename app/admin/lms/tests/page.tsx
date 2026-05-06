
import { createServerSupabaseClient } from "@/lib/supabase-server";
import TestsClient from "./TestsClient";
import fs from "fs";

export default async function TestsAdminPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  const { data: tests } = await supabase
    .from("tests")
    .select(`
      *,
      courses(title),
      test_questions(count)
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Test Builder</h1>
          <p className="text-sm text-slate-500 font-medium">Create and manage online quizzes.</p>
        </div>
      </div>

      <TestsClient courses={courses || []} initialTests={tests || []} availableBatches={batchNames} />
    </div>
  );
}
