"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createSchedule(data: {
  course_id: string;
  batch?: string;
  type: 'class' | 'test' | 'assignment';
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
}) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("schedules").insert({
    course_id: data.course_id,
    batch: data.batch,
    type: data.type,
    title: data.title,
    description: data.description,
    date: data.date,
    start_time: data.start_time,
    end_time: data.end_time
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/schedule");
  return { success: true };
}

export async function deleteSchedule(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/schedule");
  return { success: true };
}

export async function getCurriculumTopics(courseId: string) {
  const supabase = await createServerSupabaseClient();
  
  // 1. Fetch modules and their lessons
  const { data: modules } = await supabase
    .from("lms_modules")
    .select(`id, title, lessons:lessons(id, title)`)
    .eq("course_id", courseId)
    .order("order_index");

  // 2. Fetch tests for this course
  const { data: tests } = await supabase
    .from("tests")
    .select("id, title")
    .eq("course_id", courseId);

  // 3. Fetch materials for this course
  const { data: materials } = await supabase
    .from("materials")
    .select("id, title")
    .eq("course_id", courseId);

  return {
    modules: modules || [],
    tests: tests || [],
    materials: materials || []
  };
}
