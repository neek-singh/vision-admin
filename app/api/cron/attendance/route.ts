import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * API Route: /api/cron/attendance
 * Purpose: Automatically runs daily to initialize the attendance sheet 
 * (as 'absent' by default) for all active student enrollments.
 * 
 * Supports both GET and POST requests.
 * Optional protection: If process.env.CRON_SECRET is set, requests must include
 * `?token=<secret>` query parameter or an Authorization header.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const authHeader = request.headers.get("authorization");
    
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const isTokenValid = token === cronSecret;
      const isAuthValid = authHeader === `Bearer ${cronSecret}`;
      if (!isTokenValid && !isAuthValid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const supabase = await createServerSupabaseClient();
    
    // Call the database function to initialize daily attendance
    const { data, error } = await supabase.rpc("initialize_daily_attendance");

    if (error) {
      console.error("Cron RPC Error in daily attendance initialization:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Daily attendance initialized successfully.",
      initialized_records_count: data
    });
  } catch (error: any) {
    console.error("Cron daily attendance initialization API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
