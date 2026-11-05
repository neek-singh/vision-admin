"use server";

import { requireAdmin } from "@/lib/require-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyStudents } from "@/lib/notify";

/**
 * Notifies students enrolled in an assignment's course or batches upon publishing.
 */
export async function notifyAssignmentPublished(assignmentId: string) {
  await requireAdmin();

  try {
    // 1. Fetch assignment details
    const { data: assignment, error } = await supabaseAdmin
      .from("assignments")
      .select("id, title, due_date, deadline, batches, course_id")
      .eq("id", assignmentId)
      .single();

    if (error || !assignment) {
      console.error("[notifyAssignmentPublished] Assignment not found:", error);
      return { success: false, error: "Assignment not found" };
    }

    // 2. Fetch linked courses from assignment_courses join table
    const { data: linkedCourses } = await supabaseAdmin
      .from("assignment_courses")
      .select("course_id")
      .eq("assignment_id", assignmentId);

    const courseIds = new Set<string>();
    if (assignment.course_id) courseIds.add(assignment.course_id);
    linkedCourses?.forEach((lc: { course_id: string }) => {
      if (lc.course_id) courseIds.add(lc.course_id);
    });

    // 3. Find enrolled students
    const studentIds = new Set<string>();

    if (courseIds.size > 0) {
      const { data: enrolledStudents } = await supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .in("course_id", Array.from(courseIds));

      enrolledStudents?.forEach((e: { student_id: string }) => {
        if (e.student_id) studentIds.add(e.student_id);
      });
    }

    // Include batches if present
    if (Array.isArray(assignment.batches) && assignment.batches.length > 0) {
      const { data: batchStudents } = await supabaseAdmin
        .from("students")
        .select("id")
        .in("batch", assignment.batches);

      batchStudents?.forEach((s: { id: string }) => {
        if (s.id) studentIds.add(s.id);
      });

      const { data: enrollBatchStudents } = await supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .in("batch", assignment.batches);

      enrollBatchStudents?.forEach((e: { student_id: string }) => {
        if (e.student_id) studentIds.add(e.student_id);
      });
    }

    const recipientList = Array.from(studentIds);
    if (recipientList.length === 0) {
      return { success: true, count: 0 };
    }

    // 4. Format deadline string
    const targetDate = assignment.due_date || assignment.deadline;
    let deadlineStr = "jald";
    if (targetDate) {
      const d = new Date(targetDate);
      if (!isNaN(d.getTime())) {
        deadlineStr = d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        });
      }
    }

    const title = `Naya Project: ${assignment.title || "Assignment"}`.slice(0, 50);
    const body = `${assignment.title} publish hua. Deadline: ${deadlineStr}. Submit karein!`.slice(0, 120);

    await notifyStudents(recipientList, {
      title,
      body,
      url: "/assignments",
      type: "assignment",
    });

    return { success: true, count: recipientList.length };
  } catch (err: unknown) {
    console.error("[notifyAssignmentPublished] Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Error" };
  }
}

/**
 * Creates or updates an assignment and course associations using privileged supabaseAdmin (bypasses RLS 42501).
 */
export async function saveAssignment(data: {
  id?: string;
  title: string;
  description?: string;
  due_date?: string;
  total_marks?: number;
  batches?: string[] | null;
  batch?: string | null;
  lesson_id?: string | null;
  course_ids?: string[];
  is_published?: boolean;
}) {
  await requireAdmin();

  try {
    const { id, batch, course_ids, ...rest } = data;
    const payload: any = {
      ...rest,
      batches: data.batches || (batch ? [batch] : null),
    };

    let assignmentId = id;

    if (id) {
      const { error } = await supabaseAdmin
        .from("assignments")
        .update(payload)
        .eq("id", id);
      if (error) throw error;

      // Delete existing associations
      const { error: delRelError } = await supabaseAdmin
        .from("assignment_courses")
        .delete()
        .eq("assignment_id", id);
      if (delRelError) throw delRelError;
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("assignments")
        .insert([payload])
        .select("id")
        .single();
      if (error) throw error;
      assignmentId = inserted?.id;
    }

    // Insert course associations
    if (assignmentId && Array.isArray(course_ids) && course_ids.length > 0) {
      const relations = course_ids.map((cId) => ({
        assignment_id: assignmentId,
        course_id: cId,
      }));
      const { error: relError } = await supabaseAdmin
        .from("assignment_courses")
        .insert(relations);
      if (relError) throw relError;
    }

    if (assignmentId && payload.is_published) {
      notifyAssignmentPublished(assignmentId).catch((err) => {
        console.error("Failed to notify students on assignment publish:", err);
      });
    }

    return { success: true, assignmentId };
  } catch (err: any) {
    console.error("[saveAssignment] Error:", err);
    return { success: false, error: err.message || "Failed to save assignment" };
  }
}

/**
 * Deletes an assignment using privileged supabaseAdmin.
 */
export async function deleteAssignment(id: string) {
  await requireAdmin();

  try {
    const { error } = await supabaseAdmin.from("assignments").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("[deleteAssignment] Error:", err);
    return { success: false, error: err.message || "Failed to delete assignment" };
  }
}

/**
 * Toggles an assignment's published status using privileged supabaseAdmin.
 */
export async function togglePublishAssignment(id: string, currentStatus: boolean) {
  await requireAdmin();

  try {
    const nextStatus = !currentStatus;
    const { error } = await supabaseAdmin
      .from("assignments")
      .update({ is_published: nextStatus })
      .eq("id", id);
    if (error) throw error;

    if (nextStatus) {
      notifyAssignmentPublished(id).catch((err) => {
        console.error("Failed to notify students on assignment toggle publish:", err);
      });
    }

    return { success: true, nextStatus };
  } catch (err: any) {
    console.error("[togglePublishAssignment] Error:", err);
    return { success: false, error: err.message || "Failed to toggle status" };
  }
}
