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

/**
 * Creates or updates a test using privileged supabaseAdmin (bypasses RLS 42501).
 */
export async function saveTest(data: {
  id?: string;
  course_id: string;
  title: string;
  type?: string;
  duration_minutes?: number;
  batches?: string[] | null;
  batch?: string | null;
  chapter_id?: string | null;
  lesson_id?: string | null;
  is_published?: boolean;
}) {
  await requireAdmin();
  const client = supabaseAdmin;

  try {
    const { id, batch, chapter_id, lesson_id, ...rest } = data;
    const payload: any = {
      ...rest,
      batches: data.batches || (batch ? [batch] : null),
    };
    if (chapter_id !== undefined) {
      payload.chapter_id = chapter_id || null;
    }

    let testId = id;

    if (id) {
      const { error } = await client
        .from("tests")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await client
        .from("tests")
        .insert([payload])
        .select("id")
        .single();
      if (error) throw error;
      testId = inserted?.id;
    }

    if (testId && payload.is_published) {
      notifyTestPublished(testId).catch((err) => {
        console.error("Failed to notify students on test publish:", err);
      });
    }

    return { success: true, testId };
  } catch (err: any) {
    console.error("[saveTest] Error:", err);
    return { success: false, error: err.message || "Failed to save test" };
  }
}

/**
 * Deletes a test and all its questions/results using privileged supabaseAdmin.
 */
export async function deleteTest(id: string) {
  await requireAdmin();
  const client = supabaseAdmin;

  try {
    const { error } = await client.from("tests").delete().eq("id", id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("[deleteTest] Error:", err);
    return { success: false, error: err.message || "Failed to delete test" };
  }
}

/**
 * Toggles a test's published status using privileged supabaseAdmin.
 */
export async function togglePublishTest(id: string, currentStatus: boolean) {
  await requireAdmin();
  const client = supabaseAdmin;

  try {
    const nextStatus = !currentStatus;
    const { error } = await client
      .from("tests")
      .update({ is_published: nextStatus })
      .eq("id", id);
    if (error) throw error;

    if (nextStatus) {
      notifyTestPublished(id).catch((err) => {
        console.error("Failed to notify students on test toggle publish:", err);
      });
    }

    return { success: true, nextStatus };
  } catch (err: any) {
    console.error("[togglePublishTest] Error:", err);
    return { success: false, error: err.message || "Failed to toggle status" };
  }
}

/**
 * Automatically syncs a test's duration_minutes to match question count (1 question = 1 minute).
 */
async function syncTestDuration(testId: string) {
  try {
    const { count } = await supabaseAdmin
      .from("test_questions")
      .select("*", { count: "exact", head: true })
      .eq("test_id", testId);

    const questionCount = count || 0;
    await supabaseAdmin
      .from("tests")
      .update({ duration_minutes: questionCount })
      .eq("id", testId);
  } catch (err) {
    console.error("[syncTestDuration] Failed to sync duration:", err);
  }
}

/**
 * Adds or saves a test question using privileged supabaseAdmin.
 */
export async function saveTestQuestion(data: {
  id?: string;
  test_id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  order_index?: number;
}) {
  await requireAdmin();
  const client = supabaseAdmin;

  try {
    const { id, ...rest } = data;
    if (id) {
      const { error } = await client
        .from("test_questions")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await client
        .from("test_questions")
        .insert([rest]);
      if (error) throw error;
    }

    await syncTestDuration(data.test_id);
    return { success: true };
  } catch (err: any) {
    console.error("[saveTestQuestion] Error:", err);
    return { success: false, error: err.message || "Failed to save question" };
  }
}

/**
 * Deletes a test question using privileged supabaseAdmin.
 */
export async function deleteTestQuestion(id: string) {
  await requireAdmin();
  const client = supabaseAdmin;

  try {
    const { data: qData } = await client
      .from("test_questions")
      .select("test_id")
      .eq("id", id)
      .single();

    const { error } = await client
      .from("test_questions")
      .delete()
      .eq("id", id);
    if (error) throw error;

    if (qData?.test_id) {
      await syncTestDuration(qData.test_id);
    }
    return { success: true };
  } catch (err: any) {
    console.error("[deleteTestQuestion] Error:", err);
    return { success: false, error: err.message || "Failed to delete question" };
  }
}

/**
 * Bulk saves test questions using privileged supabaseAdmin.
 */
export async function saveTestQuestionsBulk(
  testId: string,
  questions: Array<{
    question_text: string;
    options: string[];
    correct_option_index: number;
    order_index?: number;
  }>
) {
  await requireAdmin();
  const client = supabaseAdmin;

  try {
    if (!testId) throw new Error("Test ID is required");
    if (!questions || questions.length === 0) {
      throw new Error("No questions provided");
    }

    // Get current question count to set correct starting order_index
    const { count } = await client
      .from("test_questions")
      .select("*", { count: "exact", head: true })
      .eq("test_id", testId);

    const startIndex = count || 0;

    const rows = questions.map((q, idx) => ({
      test_id: testId,
      question_text: q.question_text.trim(),
      options: q.options.map((opt) => (typeof opt === "string" ? opt.trim() : String(opt))),
      correct_option_index: Number(q.correct_option_index) || 0,
      order_index: q.order_index !== undefined ? q.order_index : startIndex + idx,
    }));

    // Insert rows in batches of 100 to prevent payload limits
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await client.from("test_questions").insert(batch);
      if (error) throw error;
    }

    await syncTestDuration(testId);
    return { success: true, count: rows.length };
  } catch (err: any) {
    console.error("[saveTestQuestionsBulk] Error:", err);
    return { success: false, error: err.message || "Failed to bulk save questions" };
  }
}

/**
 * Clears all questions from a test.
 */
export async function deleteAllTestQuestions(testId: string) {
  await requireAdmin();
  const client = supabaseAdmin;

  try {
    const { error } = await client
      .from("test_questions")
      .delete()
      .eq("test_id", testId);
    if (error) throw error;

    await syncTestDuration(testId);
    return { success: true };
  } catch (err: any) {
    console.error("[deleteAllTestQuestions] Error:", err);
    return { success: false, error: err.message || "Failed to clear questions" };
  }
}

