"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/require-admin";
import { notifyAdmins } from "@/lib/notify";

export interface AdmissionFormData {
  name?: string;
  father_name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  course_id?: string;
  address?: string;
  qualification?: string;
  [key: string]: unknown;
}

export async function submitAdmission(formData: AdmissionFormData) {
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

    // Send push notification to all admins (Trigger 1)
    try {
      let courseTitle = "";
      if (course_id) {
        const { data: courseData } = await supabase
          .from("courses")
          .select("title")
          .eq("id", course_id)
          .single();
        if (courseData?.title) courseTitle = courseData.title;
      }
      const courseLabel = courseTitle ? `, ${courseTitle}` : "";
      await notifyAdmins({
        title: "Nayi Admission 📋",
        body: `Nayi Admission: ${name.trim()}${courseLabel}`,
        url: "/admin/admissions",
      });
    } catch (notifErr) {
      console.error("[submitAdmission] Failed to notify admins:", notifErr);
    }

    return { success: true, data };
  } catch (e: unknown) {
    console.error("Admission saving error:", e);
    return { error: "Failed to process application" };
  }
}

export async function updateAdmissionStatus(
  id: string,
  status: "approved" | "rejected"
) {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("admissions")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("updateAdmissionStatus DB error:", error);
      return { error: "Failed to update admission status." };
    }

    revalidatePath("/admin/admissions");
    revalidatePath("/admin/students");

    return { 
      success: true
    };
  } catch (e: unknown) {
    console.error("updateAdmissionStatus auth error:", e);
    return { error: e instanceof Error ? e.message : "Unauthorized" };
  }
}

export async function verifyAdmissionDocuments(admissionId: string, verified: boolean) {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("admissions")
      .update({
        document_verified: verified,
        flow_step: verified ? "payment" : "review",
      })
      .eq("id", admissionId);

    if (error) throw error;

    revalidatePath("/admin/admissions");
    return { success: true };
  } catch (e: unknown) {
    console.error("verifyAdmissionDocuments error:", e);
    return { error: e instanceof Error ? e.message : "Failed to update document verification" };
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
  } catch (e: unknown) {
    console.error("deleteAdmissionEntry auth error:", e);
    return { error: e instanceof Error ? e.message : "Unauthorized" };
  }
}
