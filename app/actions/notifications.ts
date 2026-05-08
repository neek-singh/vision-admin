"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sendPushNotification } from "./push";
import { revalidatePath } from "next/cache";

export async function sendNotification(data: {
  title: string;
  message: string;
  type: string;
  target_type: string;
  target_value?: string;
}) {
  const supabase = await createServerSupabaseClient();

  // 1. Find target students
  let query = supabase.from("students").select("id");
  
  if (data.target_type === "batch") {
    query = query.eq("batch", data.target_value);
  } else if (data.target_type === "course") {
    query = query.eq("course", data.target_value);
  } else if (data.target_type === "student") {
    query = query.eq("id", data.target_value);
  }

  const { data: students, error: studentError } = await query;

  if (studentError || !students) {
    return { error: studentError?.message || "No students found" };
  }

  // 2. Create History Record
  const { data: history, error: historyError } = await supabase
    .from("notification_history")
    .insert({
      title: data.title,
      message: data.message,
      type: data.type,
      target_type: data.target_type,
      target_value: data.target_value,
      sent_count: students.length
    })
    .select()
    .single();

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
    return { error: masterError.message };
  }

  // 4. Link students in 'user_notifications' table
  const userLinks = students.map(s => ({
    user_id: s.id,
    notification_id: masterNotification.id,
    is_read: false
  }));

  const { error: linkError } = await supabase.from("user_notifications").insert(userLinks);

  if (linkError) {
    return { error: linkError.message };
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
}

export async function sendBatchNotification(data: {
  batch?: string;
  course_id?: string;
  title: string;
  body: string;
  url?: string;
}) {
  // Alias for legacy/internal use
  return sendNotification({
    title: data.title,
    message: data.body,
    type: 'alert',
    target_type: data.batch ? 'batch' : 'all',
    target_value: data.batch,
  });
}

export async function deleteNotification(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("notification_history").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/notifications");
  return { success: true };
}
