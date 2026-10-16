"use server";

import { requireAdmin } from "@/lib/require-admin";

/**
 * Initializes daily attendance records (as 'absent' by default) for all active 
 * enrolled students across all courses for the specified date (defaults to today).
 * Requires admin authentication.
 */
export async function initializeDailyAttendance(dateStr?: string) {
  try {
    const { supabase } = await requireAdmin();
    
    // Call the stored database function using RPC
    const { data, error } = await supabase.rpc("initialize_daily_attendance", {
      target_date: dateStr || undefined
    });

    if (error) {
      console.error("RPC Error in initializeDailyAttendance:", error);
      return { error: "Failed to initialize daily attendance" };
    }

    return { success: true, count: data };
  } catch (err: unknown) {
    console.error("Exception in initializeDailyAttendance:", err);
    return { error: err instanceof Error ? err.message : "Unauthorized" };
  }
}

export async function updateAttendanceCell(data: {
  student_id: string;
  course_id: string;
  date: string;
  status: "present" | "late" | "absent";
}) {
  try {
    const { supabase, user } = await requireAdmin();

    const checkInTime =
      data.status === "present" || data.status === "late"
        ? new Date().toISOString()
        : null;

    const { error } = await supabase.from("attendance").upsert(
      {
        student_id: data.student_id,
        course_id: data.course_id,
        date: data.date,
        status: data.status,
        marked_by: user.id,
        check_in_time: checkInTime,
      },
      { onConflict: "student_id,course_id,date" }
    );

    if (error) {
      console.error("Error in updateAttendanceCell:", error);
      return { error: "Attendance cell update nahi ho payi. Dobara koshish karein." };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("Exception in updateAttendanceCell:", err);
    return {
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }
}

export interface RosterStudent {
  id: string;
  name: string;
  student_id: string;
  photo_url?: string | null;
  enrollments: Array<{
    course_id: string;
    course_title: string;
    batch: string | null;
  }>;
}

export interface ScannerRosterData {
  date: string;
  roster: RosterStudent[];
  presentKeys: string[];
}

/**
 * Returns full active student roster, enrollments, and today's existing present records.
 * Uses Asia/Kolkata timezone on the server for accurate date calculation.
 */
export async function getScannerRoster(): Promise<
  | { success: true; data: ScannerRosterData }
  | { success: false; error: string }
> {
  try {
    const { supabase } = await requireAdmin();

    // Server-side IST date calculation (e.g. "2026-10-15")
    const todayIST = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const [studentsRes, enrollmentsRes, attendanceRes] = await Promise.all([
      supabase
        .from("students")
        .select("id, name, student_id, photo_url, status")
        .eq("status", "active"),
      supabase
        .from("enrollments")
        .select("student_id, course_id, batch, courses(id, title)"),
      supabase
        .from("attendance")
        .select("student_id, course_id, status")
        .eq("date", todayIST)
        .eq("status", "present"),
    ]);

    if (studentsRes.error) throw studentsRes.error;
    if (enrollmentsRes.error) throw enrollmentsRes.error;
    if (attendanceRes.error) throw attendanceRes.error;

    const studentMap = new Map<string, RosterStudent>();
    (studentsRes.data || []).forEach((s) => {
      const normalizedCode = s.student_id ? s.student_id.toUpperCase().trim() : "";
      studentMap.set(s.id, {
        id: s.id,
        name: s.name || "Student",
        student_id: normalizedCode,
        photo_url: s.photo_url || null,
        enrollments: [],
      });
    });

    interface CourseJoin {
      id?: string;
      title?: string;
    }

    (enrollmentsRes.data || []).forEach((e) => {
      const student = studentMap.get(e.student_id);
      if (student) {
        const courseObj = e.courses as unknown as CourseJoin | null;
        student.enrollments.push({
          course_id: e.course_id,
          course_title: courseObj?.title || "Enrolled Course",
          batch: e.batch || null,
        });
      }
    });

    const roster = Array.from(studentMap.values());
    const presentKeys = (attendanceRes.data || []).map(
      (a) => `${a.student_id}|${a.course_id}`
    );

    return {
      success: true,
      data: {
        date: todayIST,
        roster,
        presentKeys,
      },
    };
  } catch (err: unknown) {
    console.error("Exception in getScannerRoster:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Roster fetch karne mein asafalta.",
    };
  }
}

export interface CheckInItem {
  student_id: string;
  course_id: string;
  date: string;
}

/**
 * High-speed batch check-in server action.
 * Takes array of check-in items, validates, checks already-present rows to preserve check_in_time,
 * and upserts in a single batch.
 */
export async function checkInStudents(items: CheckInItem[]): Promise<
  | { success: true; count: number; message?: string }
  | { success: false; error: string }
> {
  try {
    const { supabase, user } = await requireAdmin();

    if (!Array.isArray(items) || items.length === 0) {
      return { success: true, count: 0 };
    }

    // Input validation: UUID format and date YYYY-MM-DD
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    const validItems = items.filter(
      (item) =>
        item &&
        uuidRegex.test(item.student_id) &&
        uuidRegex.test(item.course_id) &&
        dateRegex.test(item.date)
    );

    if (validItems.length === 0) {
      return { success: false, error: "Awaidh input data (Invalid check-in items)." };
    }

    // Check existing records to preserve original check_in_time for rows already present
    const studentIds = Array.from(new Set(validItems.map((i) => i.student_id)));
    const courseIds = Array.from(new Set(validItems.map((i) => i.course_id)));
    const dates = Array.from(new Set(validItems.map((i) => i.date)));

    const { data: existingRows } = await supabase
      .from("attendance")
      .select("student_id, course_id, date, status")
      .in("student_id", studentIds)
      .in("course_id", courseIds)
      .in("date", dates);

    const existingPresentSet = new Set(
      (existingRows || [])
        .filter((r) => r.status === "present")
        .map((r) => `${r.student_id}|${r.course_id}|${r.date}`)
    );

    // Filter out items already marked present
    const itemsToUpsert = validItems.filter(
      (item) => !existingPresentSet.has(`${item.student_id}|${item.course_id}|${item.date}`)
    );

    if (itemsToUpsert.length === 0) {
      return { success: true, count: 0, message: "Pehle se present hain." };
    }

    const serverNow = new Date().toISOString();
    const records = itemsToUpsert.map((item) => ({
      student_id: item.student_id,
      course_id: item.course_id,
      date: item.date,
      status: "present" as const,
      check_in_time: serverNow,
      marked_by: user.id,
    }));

    const { error: upsertError } = await supabase.from("attendance").upsert(records, {
      onConflict: "student_id,course_id,date",
    });

    if (upsertError) {
      console.error("Error in checkInStudents upsert:", upsertError);
      return { success: false, error: "Database mein attendance save nahi ho payi." };
    }

    return { success: true, count: records.length };
  } catch (err: unknown) {
    console.error("Exception in checkInStudents:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }
}
