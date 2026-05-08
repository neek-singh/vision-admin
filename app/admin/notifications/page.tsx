import { createServerSupabaseClient } from "@/lib/supabase-server";
import NotificationsClient from "./NotificationsClient";

export const revalidate = 0;

export default async function AdminNotificationsPage() {
  const supabase = await createServerSupabaseClient();

  // 1. Fetch Notification History with Read Counts
  const { data: notifications } = await supabase
    .from("notifications")
    .select(`
      *,
      user_notifications(is_read)
    `)
    .order("created_at", { ascending: false });

  const formattedNotifications = notifications?.map((n: any) => ({
    ...n,
    total_delivered: n.user_notifications?.length || 0,
    read_count: n.user_notifications?.filter((un: any) => un.is_read).length || 0
  })) || [];

  // 2. Fetch unique batches from students
  const { data: studentsList } = await supabase
    .from("students")
    .select("batch")
    .not("batch", "is", null);
  
  const batches = Array.from(new Set(studentsList?.map(s => s.batch))).sort() as string[];

  // 3. Fetch courses for targeting
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  // 3. Fetch students for targeting
  const { data: students } = await supabase
    .from("students")
    .select("id, name, student_id")
    .order("name");

  return (
    <div className="container mx-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Notification Center</h1>
        <p className="text-slate-500 font-medium text-sm mt-1">Manage announcements and targeted student updates.</p>
      </div>

      <NotificationsClient 
        initialNotifications={formattedNotifications} 
        courses={courses || []} 
        students={students || []} 
        batches={batches}
      />
    </div>
  );
}
