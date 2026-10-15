"use server";

import { requireAdmin } from "@/lib/require-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyStudents } from "@/lib/notify";

/**
 * Notifies students enrolled in a test's course or batches upon publishing.
 */
export async function notifyTestPublished(testId: string) {
  await requireAdmin();

  try {
    // 1. Fetch test details
    const { data: test, error } = await supabaseAdmin
      .from("tests")
      .select("id, title, course_id, batches")
      .eq("id", testId)
      .single();

    if (error || !test) {
      console.error("[notifyTestPublished] Test not found:", error);
      return { success: false, error: "Test not found" };
    }

    const studentIds = new Set<string>();

    if (test.course_id) {
      const { data: enrolledStudents } = await supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .eq("course_id", test.course_id);

      enrolledStudents?.forEach((e: { student_id: string }) => {
        if (e.student_id) studentIds.add(e.student_id);
      });
    }

    if (Array.isArray(test.batches) && test.batches.length > 0) {
      const { data: batchStudents } = await supabaseAdmin
        .from("students")
        .select("id")
        .in("batch", test.batches);

      batchStudents?.forEach((s: { id: string }) => {
        if (s.id) studentIds.add(s.id);
      });

      const { data: enrollBatchStudents } = await supabaseAdmin
        .from("enrollments")
        .select("student_id")
        .in("batch", test.batches);

      enrollBatchStudents?.forEach((e: { student_id: string }) => {
        if (e.student_id) studentIds.add(e.student_id);
      });
    }

    const recipientList = Array.from(studentIds);
    if (recipientList.length === 0) {
      return { success: true, count: 0 };
    }

    const title = `Naya Test: ${test.title || "Quiz"}`.slice(0, 50);
    const body = `${test.title} live ho chuka hai. Dashboard par jaakar test complete karein.`.slice(0, 120);

    await notifyStudents(recipientList, {
      title,
      body,
      url: "/tests",
      type: "test",
    });

    return { success: true, count: recipientList.length };
  } catch (err: unknown) {
    console.error("[notifyTestPublished] Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Error" };
  }
}
