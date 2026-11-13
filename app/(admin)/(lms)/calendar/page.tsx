import { createServerSupabaseClient } from "@/lib/supabase-server";
import { GoogleCalendarClient } from "@/components/lms/calendar";

export const unstable_instant = false;

export default async function AdminCalendarPage() {
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

  // Normalize events to match schedules schema
  const normalizedEvents = rawEvents.map(e => ({
    ...e,
    date: e.event_date,
    batch: "All Batches"
  }));

  const combinedSchedules = [...rawSchedules, ...normalizedEvents];

  // 2. Fetch courses for selection
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
    <div className="w-full h-full p-2 sm:p-3 overflow-hidden">
      <GoogleCalendarClient
        initialSchedules={combinedSchedules}
        courses={courses || []}
        batches={allBatches}
        batchesList={batchesList}
      />
    </div>
  );
}
