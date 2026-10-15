"use server";

import { requireAdmin } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";
import { notifyStudents } from "@/lib/notify";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getStudentIdsForBatch(batch?: string, courseId?: string): Promise<string[]> {
  const ids = new Set<string>();
  if (batch) {
    const { data: sData } = await supabaseAdmin.from("students").select("id").eq("batch", batch);
    sData?.forEach((s: { id: string }) => ids.add(s.id));

    const { data: eData } = await supabaseAdmin.from("enrollments").select("student_id").eq("batch", batch);
    eData?.forEach((e: { student_id: string }) => ids.add(e.student_id));
  } else if (courseId) {
    const { data: eData } = await supabaseAdmin.from("enrollments").select("student_id").eq("course_id", courseId);
    eData?.forEach((e: { student_id: string }) => ids.add(e.student_id));
  }
  return Array.from(ids);
}

export async function createSchedule(data: {
  course_id: string;
  batch?: string;
  type: 'class' | 'test' | 'assignment' | 'project' | 'quiz' | 'holiday' | 'event';
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
}) {
  try {
    const { supabase } = await requireAdmin();

    if (data.type === 'holiday' || data.type === 'event') {
      const { error } = await supabase.from("events").insert({
        course_id: data.course_id || null,
        type: data.type,
        title: data.title,
        description: data.description,
        event_date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        location: 'Online'
      });

      if (error) return { error: "Failed to create event" };

      revalidatePath("/admin/schedule");
      revalidatePath("/admin/calendar");
      return { success: true };
    }

    const { error } = await supabase.from("schedules").insert({
      course_id: data.course_id || null,
      batch: data.batch,
      type: data.type,
      title: data.title,
      description: data.description,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time
    });

    if (error) return { error: "Failed to create schedule" };

    // Trigger 3: Send notification to related batch students
    try {
      const studentIds = await getStudentIdsForBatch(data.batch, data.course_id);
      if (studentIds.length > 0) {
        await notifyStudents(studentIds, {
          title: "Nayi Class Schedule 📅",
          body: `${data.title}: ${data.date} ko ${data.start_time} par hai.`,
          url: "/student/schedule",
          type: "schedule"
        });
      }
    } catch (notifErr) {
      console.error("[createSchedule] Failed to notify students:", notifErr);
    }

    revalidatePath("/admin/schedule");
    revalidatePath("/admin/calendar");
    return { success: true };
  } catch (err: unknown) {
    console.error("createSchedule error:", err);
    return { error: err instanceof Error ? err.message : "Unauthorized" };
  }
}

export async function deleteSchedule(id: string) {
  try {
    const { supabase } = await requireAdmin();
    const [res1, res2] = await Promise.all([
      supabase.from("schedules").delete().eq("id", id),
      supabase.from("events").delete().eq("id", id)
    ]);
    if (res1.error && res2.error) return { error: "Failed to delete item" };
    revalidatePath("/admin/schedule");
    revalidatePath("/admin/calendar");
    return { success: true };
  } catch (err: unknown) {
    console.error("deleteSchedule error:", err);
    return { error: err instanceof Error ? err.message : "Unauthorized" };
  }
}

export async function updateScheduleDate(data: {
  id: string;
  date: string;
  isEvent?: boolean;
}) {
  try {
    const { supabase } = await requireAdmin();

    // Fetch existing schedule details for notification
    const { data: sched } = await supabase
      .from("schedules")
      .select("title, batch, course_id, start_time")
      .eq("id", data.id)
      .single();

    if (data.isEvent) {
      const { error } = await supabase
        .from("events")
        .update({ event_date: data.date })
        .eq("id", data.id);

      if (error) return { error: "Failed to update event date" };
    } else {
      const { data: updated, error } = await supabase
        .from("schedules")
        .update({ date: data.date })
        .eq("id", data.id)
        .select("id");

      if (error) return { error: "Failed to update schedule date" };

      if (!updated || updated.length === 0) {
        const { error: evError } = await supabase
          .from("events")
          .update({ event_date: data.date })
          .eq("id", data.id);
        if (evError) return { error: "Failed to update event date" };
      }
    }

    // Trigger 3: Send reschedule notification to related batch students
    try {
      const batch = sched?.batch;
      const courseId = sched?.course_id;
      const studentIds = await getStudentIdsForBatch(batch, courseId);
      if (studentIds.length > 0) {
        await notifyStudents(studentIds, {
          title: "Class Reschedule Hui ⏰",
          body: `${sched?.title || "Class"} reschedule hui: Nayi date ${data.date} hai.`,
          url: "/student/schedule",
          type: "schedule"
        });
      }
    } catch (notifErr) {
      console.error("[updateScheduleDate] Failed to notify students:", notifErr);
    }

    revalidatePath("/admin/schedule");
    revalidatePath("/admin/calendar");
    return { success: true };
  } catch (err: unknown) {
    console.error("updateScheduleDate error:", err);
    return { error: err instanceof Error ? err.message : "Unauthorized" };
  }
}

export async function duplicateSchedule(id: string, targetDate: string) {
  try {
    const { supabase } = await requireAdmin();
    
    const { data: item } = await supabase
      .from("schedules")
      .select("*")
      .eq("id", id)
      .single();

    if (item) {
      const { id: _, created_at: __, ...rest } = item;
      const { error } = await supabase.from("schedules").insert({
        ...rest,
        date: targetDate
      });
      if (error) return { error: "Failed to duplicate schedule" };
    } else {
      const { data: evItem } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (!evItem) return { error: "Item not found" };

      const { id: _, created_at: __, ...rest } = evItem;
      const { error } = await supabase.from("events").insert({
        ...rest,
        event_date: targetDate
      });
      if (error) return { error: "Failed to duplicate event" };
    }

    revalidatePath("/admin/schedule");
    revalidatePath("/admin/calendar");
    return { success: true };
  } catch (err: any) {
    console.error("duplicateSchedule error:", err);
    return { error: err.message || "Unauthorized" };
  }
}

export async function getCurriculumTopics(courseId: string) {
  try {
    const { supabase } = await requireAdmin();
    
    // 1. Fetch modules, chapters, and lessons
    const { data: modules, error } = await supabase
      .from("lms_modules")
      .select(`
        id,
        title,
        subtitle,
        order_index,
        batches,
        lms_chapters(
          id,
          title,
          order_index,
          batches,
          lessons(
            id,
            title,
            lesson_type,
            order_index,
            batches
          )
        ),
        lessons(
          id,
          title,
          lesson_type,
          chapter_id,
          order_index,
          batches
        )
      `)
      .eq("course_id", courseId)
      .order("order_index");

    if (error) {
      console.error("Error in getCurriculumTopics:", error);
      return { modules: [], tests: [], materials: [] };
    }

    // Sort and clean nested arrays
    const cleanedModules = (modules || []).map((mod: any) => {
      const sortedChapters = (mod.lms_chapters || [])
        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        .map((chap: any) => ({
          ...chap,
          lessons: (chap.lessons || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        }));

      const uncategorizedLessons = (mod.lessons || [])
        .filter((l: any) => !l.chapter_id)
        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

      return {
        ...mod,
        lms_chapters: sortedChapters,
        lessons: uncategorizedLessons
      };
    });

    // 2. Fetch tests for this course
    const { data: tests } = await supabase
      .from("tests")
      .select("id, title, batches")
      .eq("course_id", courseId);

    // 3. Fetch materials for this course
    const { data: materials } = await supabase
      .from("materials")
      .select("id, title, batches")
      .eq("course_id", courseId);

    return {
      modules: cleanedModules,
      tests: tests || [],
      materials: materials || []
    };
  } catch (err: any) {
    console.error("getCurriculumTopics error:", err);
    return { modules: [], tests: [], materials: [] };
  }
}
