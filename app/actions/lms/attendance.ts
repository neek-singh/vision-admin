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
  } catch (err: any) {
    console.error("Exception in initializeDailyAttendance:", err);
    return { error: err.message || "Unauthorized" };
  }
}
