import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * API Route: /api/cron/attendance
 * Purpose: Automatically runs daily to initialize the attendance sheet 
 * (as 'absent' by default) for all active student enrollments.
 * 
 * Strict protection (T5.1):
 * - Fails closed if CRON_SECRET is not configured.
 * - Only accepts 'Authorization: Bearer <CRON_SECRET>' header.
 * - Uses constant-time comparison against timing attacks.
 * - Uses privileged supabaseAdmin client.
 */
export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("CRON_SECRET environment variable is missing.");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization") || "";
    const expectedHeader = `Bearer ${cronSecret}`;

    const bufA = Buffer.from(authHeader);
    const bufB = Buffer.from(expectedHeader);

    const isAuthorized = bufA.length === bufB.length && timingSafeEqual(bufA, bufB);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call stored procedure using supabaseAdmin (since public execution is revoked)
    const { data, error } = await supabaseAdmin.rpc("initialize_daily_attendance");

    if (error) {
      console.error("Cron RPC Error in daily attendance initialization:", error);
      return NextResponse.json({ error: "Cron execution failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Daily attendance initialized successfully.",
      initialized_records_count: data
    });
  } catch (error: any) {
    console.error("Cron daily attendance initialization API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
