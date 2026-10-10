import Link from "next/link";
import { Calendar } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import CalendarClient from "@/components/lms/calendar/CalendarClient";

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
    <div className="container mx-auto px-6 lg:px-8 py-10 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Calendar & Events</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Schedule classes, tests, and holidays.</p>
        </div>
        <Link
          href="/admin/calendar"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition w-fit"
        >
          <Calendar size={15} />
          <span>Open Full Interactive Calendar</span>
        </Link>
      </div>

      <CalendarClient courses={courses || []} initialEvents={events || []} />
    </div>
  );
}
