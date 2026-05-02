"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function updateAdmissionStatus(
    id: string,
    status: "approved" | "rejected"
) {
    const supabase = await createServerSupabaseClient();

    let studentIdGenerated = "";
    let passwordGenerated = "";

    // If approving, create a student account
    if (status === "approved") {
        // 1. Get admission details
        const { data: admission, error: fetchError } = await supabase
            .from("admissions")
            .select("*, courses(course_code, title)")
            .eq("id", id)
            .single();

        if (fetchError || !admission) {
            return { error: "Could not find admission record." };
        }

        // 2. Check if student already exists for this admission
        const { data: existingStudent } = await supabase
            .from("students")
            .select("id, student_id")
            .eq("admission_id", id)
            .single();

        if (!existingStudent) {
            // 3. Generate Sequential Student ID
            const year = new Date().getFullYear();
            const rawCourseCode = admission.courses?.course_code?.toUpperCase() || "GEN";
            const courseCode = rawCourseCode.length > 5 ? rawCourseCode.slice(0, 5) : rawCourseCode;
            
            // Count existing students for this year and course to get the next number
            const { count } = await supabase
                .from("students")
                .select("*", { count: "exact", head: true })
                .ilike("student_id", `VIT-${year}${courseCode}%`);
            
            const nextNumber = (count || 0) + 1;
            const sequence = nextNumber.toString().padStart(4, "0");
            const studentId = `VIT-${year}${courseCode}${sequence}`;

            // 4. Generate Password
            const firstName = admission.student_name.split(" ")[0];
            const last4Phone = admission.phone.slice(-4);
            const plainPassword = `${firstName}@${last4Phone}`;
            
            studentIdGenerated = studentId;
            passwordGenerated = plainPassword;

            // 5. Hash Password
            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            // 6. Insert into students table
            const { error: studentError } = await supabase
                .from("students")
                .insert({
                    student_id: studentId,
                    name: admission.student_name,
                    email: admission.email,
                    phone: admission.phone,
                    course: admission.courses?.title || "N/A",
                    password: hashedPassword,
                    admission_id: id
                });

            if (studentError) {
                console.error("Student creation error:", studentError);
                return { error: "Failed to create student account: " + studentError.message };
            }
        } else {
            studentIdGenerated = existingStudent.student_id;
            passwordGenerated = "(Already Generated)";
        }
    }

    // Update admission status
    const { error } = await supabase
        .from("admissions")
        .update({ status })
        .eq("id", id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/admin/admissions");
    revalidatePath("/admin/students");

    return { 
        success: true, 
        credentials: status === "approved" ? {
            studentId: studentIdGenerated,
            password: passwordGenerated
        } : null
    };
}