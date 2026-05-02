
import { createServerSupabaseClient } from "@/lib/supabase-server";
import CalendarClient from "./CalendarClient";

export default async function CalendarAdminPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  const { data: events } = await supabase
    .from("events")
    .select(`
      *,
      courses(title)
    `)
    .order("event_date", { ascending: true });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Calendar & Events</h1>
          <p className="text-sm text-slate-500 font-medium">Schedule classes, tests, and holidays.</p>
        </div>
      </div>

      <CalendarClient courses={courses || []} initialEvents={events || []} />
    </div>
  );
}
