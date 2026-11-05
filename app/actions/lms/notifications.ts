"use server";

import { requireAdmin } from "@/lib/require-admin";
import { sendPushNotification } from "@/lib/push";
import { revalidatePath } from "next/cache";

export async function sendNotification(data: {
  title: string;
  message: string;
  type: string;
  target_type: string;
  target_value?: string;
}) {
  try {
    const { supabase } = await requireAdmin();

    // 1. Find target students
    const targetStudentIds = new Set<string>();

    if (data.target_type === "batch" && data.target_value) {
      const [fromStudents, fromEnrollments] = await Promise.all([
        supabase.from("students").select("id").eq("batch", data.target_value),
        supabase.from("enrollments").select("student_id").eq("batch", data.target_value)
      ]);
      fromStudents.data?.forEach((s: { id: string }) => targetStudentIds.add(s.id));
      fromEnrollments.data?.forEach((e: { student_id: string }) => targetStudentIds.add(e.student_id));
    } else if (data.target_type === "course" && data.target_value) {
      const [fromStudents, fromEnrollments] = await Promise.all([
        supabase.from("students").select("id").eq("course", data.target_value),
        supabase.from("enrollments").select("student_id").eq("course_id", data.target_value)
      ]);
      fromStudents.data?.forEach((s: { id: string }) => targetStudentIds.add(s.id));
      fromEnrollments.data?.forEach((e: { student_id: string }) => targetStudentIds.add(e.student_id));
    } else if ((data.target_type === "student" || data.target_type === "individual") && data.target_value) {
      targetStudentIds.add(data.target_value);
    } else {
      // Default: All active students
      const { data: allStudents } = await supabase.from("students").select("id").eq("status", "active");
      allStudents?.forEach((s: { id: string }) => targetStudentIds.add(s.id));
    }

    const students = Array.from(targetStudentIds).map(id => ({ id }));

    // 2. Create History Record
    const { error: historyError } = await supabase
      .from("notification_history")
      .insert({
        title: data.title,
        message: data.message,
        type: data.type,
        target_type: data.target_type,
        target_value: data.target_value,
        sent_count: students.length
      });

    if (historyError) console.error("History error:", historyError);

    // 3. Create Record in 'notifications' table (Master Record)
    const { data: masterNotification, error: masterError } = await supabase
      .from("notifications")
      .insert({
        title: data.title,
        message: data.message,
        type: data.type
      })
      .select()
      .single();

    if (masterError) {
      console.error("Master Notification error:", masterError);
      return { error: "Failed to create notification" };
    }

    // 4. Link students in 'user_notifications' table
    if (students.length > 0) {
      const userLinks = students.map(s => ({
        user_id: s.id,
        notification_id: masterNotification.id,
        is_read: false
      }));

      const { error: linkError } = await supabase.from("user_notifications").insert(userLinks);

      if (linkError) {
        console.error("user_notifications link error:", linkError);
        return { error: "Failed to link user notifications" };
      }
    }

    // 5. Send Push Notifications in parallel
    await Promise.all(students.map(s => 
      sendPushNotification(s.id, {
        title: data.title,
        body: data.message,
        url: '/notifications'
      })
    ));

    revalidatePath("/admin/notifications");
    return { success: true, count: students.length };
  } catch (err: unknown) {
    console.error("sendNotification error:", err);
    return { error: err instanceof Error ? err.message : "Unauthorized" };
  }
}

export async function sendBatchNotification(data: {
  batch?: string;
  course_id?: string;
  title: string;
  body: string;
  url?: string;
}) {
  await requireAdmin();
  return sendNotification({
    title: data.title,
    message: data.body,
    type: 'alert',
    target_type: data.batch ? 'batch' : 'all',
    target_value: data.batch,
  });
}

export async function deleteNotification(id: string) {
  try {
    const { supabase } = await requireAdmin();
    await supabase.from("user_notifications").delete().eq("notification_id", id);
    await supabase.from("notification_history").delete().eq("id", id);
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return { error: "Failed to delete notification" };
    revalidatePath("/admin/notifications");
    return { success: true };
  } catch (err: unknown) {
    console.error("deleteNotification error:", err);
    return { error: err instanceof Error ? err.message : "Unauthorized" };
  }
}
