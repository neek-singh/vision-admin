import { createServerSupabaseClient } from "@/lib/supabase-server";
import ScheduleClient from "@/components/lms/schedule/ScheduleClient";

export const unstable_instant = false;

export default async function AdminSchedulePage() {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch current schedules and events in parallel
  const [schedulesRes, eventsRes] = await Promise.all([
    supabase
      .from("schedules")
      .select(`
        *,
        courses (id, title)
      `)
      .order("date", { ascending: true }),
    supabase
      .from("events")
      .select(`
        *,
        courses (id, title)
      `)
      .order("event_date", { ascending: true })
  ]);

  const rawSchedules = schedulesRes.data || [];
  const rawEvents = eventsRes.data || [];

  // Normalize events to match schedules schema (use date instead of event_date, default batch to All Batches)
  const normalizedEvents = rawEvents.map(e => ({
    ...e,
    date: e.event_date,
    batch: "All Batches"
  }));

  const combinedSchedules = [...rawSchedules, ...normalizedEvents];

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
    <div className="container mx-auto py-6">
      <ScheduleClient 
        initialSchedules={combinedSchedules} 
        courses={courses || []} 
        batches={allBatches}
        batchesList={batchesList}
      />
    </div>
  );
}
