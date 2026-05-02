import { createServerSupabaseClient } from "@/lib/supabase-server";
import ScheduleClient from "./ScheduleClient";

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

  return (
    <div className="container mx-auto px-6 py-10">
      <ScheduleClient 
        initialSchedules={schedules || []} 
        courses={courses || []} 
      />
    </div>
  );
}
