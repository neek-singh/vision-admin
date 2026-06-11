"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * Initializes daily attendance records (as 'absent' by default) for all active 
 * enrolled students across all courses for the specified date (defaults to today).
 * This function uses the `initialize_daily_attendance` PostgreSQL stored procedure.
 */
export async function initializeDailyAttendance(dateStr?: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Call the stored database function using RPC
    const { data, error } = await supabase.rpc("initialize_daily_attendance", {
      target_date: dateStr || undefined
    });

    if (error) {
      console.error("RPC Error in initializeDailyAttendance:", error);
      return { error: error.message };
    }

    return { success: true, count: data };
  } catch (err: any) {
    console.error("Exception in initializeDailyAttendance:", err);
    return { error: err.message || "Failed to initialize daily attendance" };
  }
}

