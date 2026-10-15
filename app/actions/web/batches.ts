"use server";

import { requireAdmin } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";

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
  try {
    const { supabase } = await requireAdmin();

    if (data.id) {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from("batches")
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        console.error("saveBatch update error:", error);
        return { error: "Failed to update batch" };
      }
      revalidatePath("/admin/batches");
      return { success: true };
    } else {
      const { error } = await supabase
        .from("batches")
        .insert([data]);

      if (error) {
        console.error("saveBatch insert error:", error);
        return { error: "Failed to create batch" };
      }
      revalidatePath("/admin/batches");
      return { success: true };
    }
  } catch (err: any) {
    console.error("saveBatch auth error:", err);
    return { error: err.message || "Unauthorized" };
  }
}

export async function deleteBatch(id: string) {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("batches")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("deleteBatch error:", error);
      return { error: "Failed to delete batch" };
    }
    revalidatePath("/admin/batches");
    return { success: true };
  } catch (err: any) {
    console.error("deleteBatch auth error:", err);
    return { error: err.message || "Unauthorized" };
  }
}
