import { createServerSupabaseClient } from "@/lib/supabase-server";
import ScheduleClient from "./ScheduleClient";
import fs from "fs";

export const revalidate = 0;

export default async function AdminSchedulePage() {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch current schedules
  const { data: schedules } = await supabase
    .from("schedules")
    .select(`
      *,
      courses (id, title)
    `)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  // 2. Fetch courses for the selection dropdown
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  // 3. Read batches from the JSON file (same source as Manage Batches page)
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

  // Extract unique batch type names (e.g. "Morning Batch", "Afternoon Batch")
  const batchNames = Array.from(new Set(batchesList.map(b => b.type).filter(Boolean)));
  const allBatches = ["All Batches", ...batchNames];

  return (
    <div className="container mx-auto px-4 py-6">
      <ScheduleClient 
        initialSchedules={schedules || []} 
        courses={courses || []} 
        batches={allBatches}
        batchesList={batchesList}
      />
    </div>
  );
}
