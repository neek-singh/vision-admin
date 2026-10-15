"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/require-admin";

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

    // Basic input validation (T1.4)
    if (!name || typeof name !== "string" || name.trim().length > 100) {
      return { error: "Please provide a valid name (max 100 characters)." };
    }
    if (phone && (typeof phone !== "string" || phone.length > 20)) {
      return { error: "Please provide a valid phone number." };
    }
    if (email && (typeof email !== "string" || email.length > 100)) {
      return { error: "Please provide a valid email address." };
    }

    const { data, error } = await supabase
      .from("admissions")
      .insert({
        user_id: user?.id || null,
        student_name: name.trim(),
        father_name: father_name ? String(father_name).slice(0, 100).trim() : null,
        email: email ? String(email).slice(0, 100).trim() : null,
        phone: phone ? String(phone).slice(0, 20).trim() : null,
        dob: dob || null,
        course_id: course_id || null,
        address: address ? String(address).slice(0, 300).trim() : null,
        qualification: qualification ? String(qualification).slice(0, 100).trim() : null,
        status: "pending"
      })
      .select();

    if (error) {
      console.error("Supabase admission insert error:", error);
      return { error: "Failed to submit application. Please try again later." };
    }

    revalidatePath("/admin/admissions");
    return { success: true, data };
  } catch (e: any) {
    console.error("Admission saving error:", e);
    return { error: "Failed to process application" };
  }
}

export async function deleteAdmissionEntry(id: string) {
  try {
    const { supabase } = await requireAdmin();
    
    const { error } = await supabase
      .from("admissions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Admission deletion error:", error);
      return { error: "Failed to delete application" };
    }

    revalidatePath("/admin/admissions");
    return { success: true };
  } catch (e: any) {
    console.error("deleteAdmissionEntry auth error:", e);
    return { error: e.message || "Unauthorized" };
  }
}
