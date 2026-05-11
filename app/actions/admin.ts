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
            const idPrefix = `VIT${year}STD`;
            
            // Count existing students with this year and STD prefix to get the next number
            const { count } = await supabase
                .from("students")
                .select("*", { count: "exact", head: true })
                .ilike("student_id", `${idPrefix}%`);
            
            const nextNumber = (count || 0) + 1;
            const sequence = nextNumber.toString().padStart(3, "0");
            const studentId = `${idPrefix}${sequence}`;

            // 4. Generate Password
            const firstName = admission.student_name.split(" ")[0];
            const last4Phone = admission.phone.slice(-4);
            const plainPassword = `${firstName}@${last4Phone}`;
            
            studentIdGenerated = studentId;
            passwordGenerated = plainPassword;

            // 5. Hash Password
            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            // 6. Insert into students table
            const { data: newStudent, error: studentError } = await supabase
                .from("students")
                .insert({
                    student_id: studentId,
                    name: admission.student_name,
                    email: admission.email,
                    phone: admission.phone,
                    course: (admission.courses as any)?.title || "N/A",
                    password: hashedPassword,
                    admission_id: id
                })
                .select()
                .single();

            if (studentError) {
                console.error("Student creation error:", studentError);
                return { error: "Failed to create student account: " + studentError.message };
            }

            // 7. Create enrollment
            if (newStudent) {
                await supabase
                    .from("enrollments")
                    .insert({
                        student_id: newStudent.id,
                        course_id: admission.course_id,
                        batch: null, // assigned later or not applicable
                        progress_percentage: 0
                    });
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

export async function assignCourseToStudent(studentId: string, courseId: string, batch?: string) {
    const supabase = await createServerSupabaseClient();

    // Check if already enrolled
    const { data: existing } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId)
        .eq("course_id", courseId)
        .single();

    if (existing) {
        return { error: "Student is already enrolled in this course." };
    }

    // Fetch course details for title/code
    const { data: courseData } = await supabase
        .from("courses")
        .select("title, course_code")
        .eq("id", courseId)
        .single();

    const { error } = await supabase
        .from("enrollments")
        .insert({
            student_id: studentId,
            course_id: courseId,
            batch: batch || null,
            progress_percentage: 0
        });

    if (error) {
        console.error("Enrollment error:", error);
        return { error: error.message };
    }

    // Automatically update student's primary course if not set or legacy N/A
    if (courseData) {
        const { data: student } = await supabase
            .from("students")
            .select("course")
            .eq("id", studentId)
            .single();

        if (!student?.course || student.course === "N/A") {
            await supabase
                .from("students")
                .update({ course: courseData.title })
                .eq("id", studentId);
        }
    }

    revalidatePath("/admin/students");
    return { success: true };
}

export async function removeCourseFromStudent(enrollmentId: string) {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
        .from("enrollments")
        .delete()
        .eq("id", enrollmentId);

    if (error) {
        console.error("Unenrollment error:", error);
        return { error: error.message };
    }

    revalidatePath("/admin/students");
    return { success: true };
}

export async function updateEnrollmentBatch(enrollmentId: string, batch: string | null) {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
        .from("enrollments")
        .update({ batch })
        .eq("id", enrollmentId);

    if (error) {
        console.error("Update batch error:", error);
        return { error: error.message };
    }

    revalidatePath("/admin/students");
    return { success: true };
}

export async function updateStudentBatch(studentId: string, batch: string | null) {
    const supabase = await createServerSupabaseClient();

    // 1. Update student's global batch
    const { error: studentError } = await supabase
        .from("students")
        .update({ batch })
        .eq("id", studentId);

    if (studentError) {
        console.error("Update student batch error:", studentError);
        return { error: studentError.message };
    }

    // 2. Update all enrollments for this student
    const { error: enrollmentError } = await supabase
        .from("enrollments")
        .update({ batch })
        .eq("student_id", studentId);

    if (enrollmentError) {
        console.error("Update enrollments batch error:", enrollmentError);
        return { error: enrollmentError.message };
    }

    revalidatePath("/admin/students");
    return { success: true };
}
