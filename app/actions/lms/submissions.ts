"use server";

import { notifyAdmins, notifyStudent } from "@/lib/notify";
import { requireAdmin } from "@/lib/require-admin";
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

/**
 * Grades a student submission and notifies the student immediately.
 */
export async function gradeSubmission(data: {
  submissionId: string;
  score: string;
  marks?: number | null;
  feedback?: string;
}) {
  await requireAdmin();

  try {
    const { submissionId, score, marks, feedback } = data;

    // 1. Fetch submission details
    const { data: submission, error: fetchErr } = await supabaseAdmin
      .from("submissions")
      .select("id, student_id, assignment_id, lesson_id")
      .eq("id", submissionId)
      .single();

    if (fetchErr || !submission) {
      return { success: false, error: "Submission not found" };
    }

    // 2. Update submission
    const numericMarks = marks !== undefined && marks !== null ? marks : (parseInt(score) || null);
    const { error: updateErr } = await supabaseAdmin
      .from("submissions")
      .update({
        score,
        marks: numericMarks,
        feedback: feedback || null,
        graded_at: new Date().toISOString(),
        status: "graded",
      })
      .eq("id", submissionId);

    if (updateErr) throw updateErr;

    // 3. Find assignment or lesson title for friendly notification
    let itemTitle = "Project / Assignment";
    if (submission.assignment_id) {
      const { data: a } = await supabaseAdmin
        .from("assignments")
        .select("title")
        .eq("id", submission.assignment_id)
        .maybeSingle();
      if (a?.title) itemTitle = a.title;
    } else if (submission.lesson_id) {
      const { data: l } = await supabaseAdmin
        .from("lessons")
        .select("title")
        .eq("id", submission.lesson_id)
        .maybeSingle();
      if (l?.title) itemTitle = l.title;
    }

    // 4. Notify student
    if (submission.student_id) {
      const title = `Grade Update: ${itemTitle}`.slice(0, 50);
      const body = `Aapka submission check ho gaya hai. Score: ${score}${feedback ? ` | Note: ${feedback}` : ""}`.slice(0, 120);

      await notifyStudent(submission.student_id, {
        title,
        body,
        url: "/assignments",
        type: "assignment_graded",
      });
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("[gradeSubmission] Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to grade submission" };
  }
}
