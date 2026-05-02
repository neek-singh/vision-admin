"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function sendNotification(formData: {
  title: string;
  message: string;
  type: string;
  target_type: string;
  target_value: string;
}) {
  const supabase = await createServerSupabaseClient();

  // 1. Create the main notification
  const { data: notification, error: notifyError } = await supabase
    .from("notifications")
    .insert({
      title: formData.title,
      message: formData.message,
      type: formData.type,
      target_type: formData.target_type,
      target_value: formData.target_value
    })
    .select()
    .single();

  if (notifyError) return { error: notifyError.message };

  // 2. Identify target users
  let userIds: string[] = [];

  if (formData.target_type === "all") {
    const { data: students } = await supabase.from("students").select("id");
    userIds = students?.map(s => s.id) || [];
  } else if (formData.target_type === "course") {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("course_id", formData.target_value);
    userIds = enrollments?.map(e => e.student_id) || [];
  } else if (formData.target_type === "batch") {
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("batch", formData.target_value);
    userIds = students?.map(s => s.id) || [];
  } else if (formData.target_type === "individual") {
    userIds = [formData.target_value];
  }

  // 3. Link notification to target users
  if (userIds.length > 0) {
    const userNotifications = userIds.map(uid => ({
      notification_id: notification.id,
      user_id: uid,
      is_read: false
    }));

    const { error: linkError } = await supabase
      .from("user_notifications")
      .insert(userNotifications);

    if (linkError) console.error("Error linking users:", linkError);
  }

  revalidatePath("/admin/notifications");
  return { success: true };
}

export async function deleteNotification(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/notifications");
  return { success: true };
}
