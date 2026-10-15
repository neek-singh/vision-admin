"use server";

import { notifyAdmins } from "@/lib/notify";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Notifies admins when a student submits an assignment or project.
 * Designed to be safely invoked on student submission.
 */
export async function notifyAssignmentSubmission(data: {
  studentName?: string;
  assignmentTitle?: string;
  studentId?: string;
  assignmentId?: string;
  lessonId?: string;
}) {
  try {
    let studentName = data.studentName?.trim();
    let assignmentTitle = data.assignmentTitle?.trim();

    // If student name missing, query from DB
    if (!studentName && data.studentId) {
      const { data: student } = await supabaseAdmin
        .from("students")
        .select("name")
        .eq("id", data.studentId)
        .maybeSingle();

      if (student?.name) {
        studentName = student.name;
      } else {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", data.studentId)
          .maybeSingle();
        studentName = profile?.full_name || "Student";
      }
    }

    // If assignment title missing, query from DB
    if (!assignmentTitle) {
      if (data.assignmentId) {
        const { data: assignment } = await supabaseAdmin
          .from("assignments")
          .select("title")
          .eq("id", data.assignmentId)
          .maybeSingle();
        assignmentTitle = assignment?.title;
      } else if (data.lessonId) {
        const { data: lesson } = await supabaseAdmin
          .from("lessons")
          .select("title")
          .eq("id", data.lessonId)
          .maybeSingle();
        assignmentTitle = lesson?.title;
      }
    }

    const sName = studentName || "Ek student";
    const aTitle = assignmentTitle || "assignment";

    const title = "Nayi Assignment Submission 📥".slice(0, 50);
    const body = `${sName} ne ${aTitle} submit kiya.`.slice(0, 120);

    return await notifyAdmins({
      title,
      body,
      url: "/admin/lms/projects",
      type: "assignment_submission",
    });
  } catch (err: unknown) {
    console.error("[notifyAssignmentSubmission] Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Error" };
  }
}
