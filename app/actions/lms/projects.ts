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
