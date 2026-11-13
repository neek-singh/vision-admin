import { createServerSupabaseClient } from "@/lib/supabase-server";
import NotificationsClient from "@/components/lms/notifications/NotificationsClient";

export const unstable_instant = false;

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

  const formattedNotifications =
    notifications?.map((n: any) => ({
      ...n,
      total_delivered: n.user_notifications?.length || 0,
      read_count: n.user_notifications?.filter((un: any) => un.is_read).length || 0,
    })) || [];

  // 2. Fetch unique batches from students
  const { data: studentsList } = await supabase
    .from("students")
    .select("batch")
    .not("batch", "is", null);

  const batches = Array.from(new Set(studentsList?.map((s) => s.batch))).filter(
    Boolean
  ).sort() as string[];

  // 3. Fetch courses for targeting
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  // 4. Fetch students for targeting
  const { data: students } = await supabase
    .from("students")
    .select("id, name, student_id")
    .order("name");

  return (
    <div className="container mx-auto px-6 lg:px-8 py-8 max-w-6xl space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Notification Center
          </h1>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
            {formattedNotifications.length}{" "}
            {formattedNotifications.length === 1 ? "announcement" : "announcements"}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Broadcast institute announcements and targeted updates to students.
        </p>
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
