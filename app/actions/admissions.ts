"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function submitAdmission(formData: any) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { 
      name, 
      father_name, 
      email, 
      phone, 
      dob, 
      course_id, 
      address, 
      qualification 
    } = formData;

    const { data, error } = await supabase
      .from("admissions")
      .insert({
        user_id: user?.id || null,
        student_name: name, // Map 'name' to 'student_name' if the table uses student_name
        father_name,
        email,
        phone,
        dob,
        course_id,
        address,
        qualification,
        status: "pending"
      })
      .select();

    if (error) {
      console.error("Supabase admission insert error:", error);
      throw error;
    }

    revalidatePath("/admin/admissions");
    return { success: true, data };
  } catch (e: any) {
    console.error("Admission saving error:", e);
    return { error: e.message || "Failed to process application" };
  }
}

export async function deleteAdmissionEntry(id: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { error } = await supabase
      .from("admissions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/admissions");
    return { success: true };
  } catch (e: any) {
    console.error("Admission deletion error:", e);
    return { error: e.message || "Failed to delete application" };
  }
}

