"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function saveBatch(data: {
  id?: string;
  title: string;
  course_id?: string;
  faculty_name?: string;
  start_date?: string;
  end_date?: string;
  timing?: string;
  max_seats?: number;
  available_seats?: number;
  status?: string;
}) {
  const supabase = await createServerSupabaseClient();

  if (data.id) {
    const { id, ...updateData } = data;
    const { error } = await supabase
      .from("batches")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { error: error.message };
    return { success: true };
  } else {
    const { error } = await supabase
      .from("batches")
      .insert([data]);

    if (error) return { error: error.message };
    return { success: true };
  }
}

export async function deleteBatch(id: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("batches")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}
