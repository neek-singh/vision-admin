import { createServerSupabaseClient } from "@/lib/supabase-server";
import ScheduleClient from "@/components/lms/schedule/ScheduleClient";

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

  // 3. Fetch batches from Database
  const { data: dbBatches } = await supabase
    .from("batches")
    .select(`
      *,
      courses(id, title)
    `)
    .order("title");

  const batchesList = dbBatches || [];
  const allBatches = ["All Batches", ...batchesList.map(b => b.title)];

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
