"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function updateAdmissionStatus(
    id: string,
    status: "approved" | "rejected"
) {
    const supabase = await createServerSupabaseClient();

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
        success: true
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

export async function verifyAdmissionDocuments(admissionId: string, verified: boolean) {
    try {
        const supabase = await createServerSupabaseClient();

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
    } catch (e: any) {
        console.error("Document verification error:", e);
        return { error: e.message || "Failed to verify documents" };
    }
}

// Student Trash & Soft Delete Actions
export async function moveToTrashStudent(id: string) {
    try {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase
            .from("students")
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString()
            })
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/admin/students");
        revalidatePath("/admin/fees");
        return { success: true };
    } catch (e: any) {
        console.error("moveToTrashStudent error:", e);
        return { error: e.message || "Failed to move student to trash" };
    }
}

export async function bulkMoveToTrashStudents(ids: string[]) {
    try {
        if (!ids.length) return { success: true };
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase
            .from("students")
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString()
            })
            .in("id", ids);

        if (error) throw error;

        revalidatePath("/admin/students");
        revalidatePath("/admin/fees");
        return { success: true };
    } catch (e: any) {
        console.error("bulkMoveToTrashStudents error:", e);
        return { error: e.message || "Failed to move students to trash" };
    }
}

export async function restoreStudent(id: string) {
    try {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase
            .from("students")
            .update({
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            })
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/admin/students");
        revalidatePath("/admin/fees");
        return { success: true };
    } catch (e: any) {
        console.error("restoreStudent error:", e);
        return { error: e.message || "Failed to restore student" };
    }
}

export async function bulkRestoreStudents(ids: string[]) {
    try {
        if (!ids.length) return { success: true };
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase
            .from("students")
            .update({
                is_deleted: false,
                deleted_at: null,
                deleted_by: null
            })
            .in("id", ids);

        if (error) throw error;

        revalidatePath("/admin/students");
        revalidatePath("/admin/fees");
        return { success: true };
    } catch (e: any) {
        console.error("bulkRestoreStudents error:", e);
        return { error: e.message || "Failed to restore students" };
    }
}

export async function permanentDeleteStudent(id: string) {
    try {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase
            .from("students")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/admin/students");
        revalidatePath("/admin/fees");
        return { success: true };
    } catch (e: any) {
        console.error("permanentDeleteStudent error:", e);
        return { error: e.message || "Failed to permanently delete student" };
    }
}

export async function emptyTrashStudents() {
    try {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase
            .from("students")
            .delete()
            .eq("is_deleted", true);

        if (error) throw error;

        revalidatePath("/admin/students");
        revalidatePath("/admin/fees");
        return { success: true };
    } catch (e: any) {
        console.error("emptyTrashStudents error:", e);
        return { error: e.message || "Failed to empty trash" };
    }
}

export async function updateStudentAcademicStatus(data: {
    id: string;
    status: "active" | "dropped_out" | "on_hold" | "completed" | "inactive";
    dropout_date?: string | null;
    dropout_reason?: string | null;
    dropout_remarks?: string | null;
}) {
    try {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase
            .from("students")
            .update({
                status: data.status,
                dropout_date: data.dropout_date || null,
                dropout_reason: data.dropout_reason || null,
                dropout_remarks: data.dropout_remarks || null
            })
            .eq("id", data.id);

        if (error) throw error;

        revalidatePath("/admin/students");
        revalidatePath("/admin/fees");
        revalidatePath("/admin");
        revalidatePath("/admin/lms/analytics");
        return { success: true };
    } catch (e: any) {
        console.error("updateStudentAcademicStatus error:", e);
        return { error: e.message || "Failed to update academic status" };
    }
}

export async function bulkUpdateStudentStatus(
    ids: string[],
    newStatus: "active" | "dropped_out" | "on_hold" | "completed" | "inactive"
) {
    try {
        if (!ids.length) return { success: true };
        const supabase = await createServerSupabaseClient();
        const updateData: any = { status: newStatus };
        if (newStatus === "dropped_out") {
            updateData.dropout_date = new Date().toISOString().split('T')[0];
            updateData.dropout_reason = "Bulk Dropout Update";
        }
        const { error } = await supabase
            .from("students")
            .update(updateData)
            .in("id", ids);

        if (error) throw error;

        revalidatePath("/admin/students");
        revalidatePath("/admin/fees");
        revalidatePath("/admin");
        revalidatePath("/admin/lms/analytics");
        return { success: true };
    } catch (e: any) {
        console.error("bulkUpdateStudentStatus error:", e);
        return { error: e.message || "Failed to update status in bulk" };
    }
}


