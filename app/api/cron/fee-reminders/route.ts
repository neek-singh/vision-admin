import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyStudent } from "@/lib/notify";

/**
 * API Route: /api/cron/fee-reminders
 * Purpose: Automatically runs daily to send push notifications to students
 * whose fee installment due date is in 3 days, today, or overdue.
 *
 * Security:
 * - Fails closed (500) if CRON_SECRET is not configured.
 * - Requires 'Authorization: Bearer <CRON_SECRET>' header.
 * - Constant-time comparison via crypto.timingSafeEqual.
 */
export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("[cron/fee-reminders] CRON_SECRET environment variable is missing.");
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

    // Calculate dates in YYYY-MM-DD
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysLaterStr = threeDaysLater.toISOString().split("T")[0];

    const todayStartStr = `${todayStr}T00:00:00.000Z`;

    // Query pending installments due in <= 3 days (including today and overdue)
    const { data: installments, error: instError } = await supabaseAdmin
      .from("installments")
      .select(`
        id,
        amount,
        due_date,
        status,
        last_reminder_sent_at,
        fees (
          id,
          student_id,
          status,
          courses (
            title
          )
        )
      `)
      .neq("status", "paid")
      .lte("due_date", threeDaysLaterStr)
      .order("due_date", { ascending: true });

    if (instError) {
      console.error("[cron/fee-reminders] Error fetching installments:", instError);
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    if (!installments || installments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No fee installments due for reminders.",
        reminders_sent: 0,
      });
    }

    let sentCount = 0;
    const skippedCount = 0;

    for (const inst of installments) {
      const feeData = inst.fees as unknown as {
        id: string;
        student_id: string;
        status: string;
        courses?: { title?: string } | null;
      } | null;

      const studentId = feeData?.student_id;
      if (!studentId) continue;

      // 1. Check if already sent today via last_reminder_sent_at
      if (inst.last_reminder_sent_at === todayStr) {
        continue;
      }

      // 2. Fallback duplicate check via notification_history
      const { data: existingHistory } = await supabaseAdmin
        .from("notification_history")
        .select("id")
        .eq("target_type", "fee_reminder")
        .eq("target_value", inst.id)
        .gte("created_at", todayStartStr)
        .limit(1);

      if (existingHistory && existingHistory.length > 0) {
        continue;
      }

      // 3. Compose concise Hinglish message
      const amount = inst.amount;
      const dueDate = inst.due_date;
      let body = `Aapki ₹${amount} ki fee installment ${dueDate} tak due hai. Kripya samay par jama karein.`;

      if (dueDate === todayStr) {
        body = `Aapki ₹${amount} ki fee installment aaj due hai. Kripya jald se jald jama karein.`;
      } else if (dueDate < todayStr) {
        body = `Aapki ₹${amount} ki fee installment overdue ho gayi hai. Kripya turant jama karein.`;
      }

      // 4. Send notification to student (push + db notification record)
      try {
        await notifyStudent(studentId, {
          title: "Fee Due Reminder 💳",
          body,
          url: "/student/fees",
          type: "alert",
        });

        // 5. Update last_reminder_sent_at on installment
        await supabaseAdmin
          .from("installments")
          .update({ last_reminder_sent_at: todayStr })
          .eq("id", inst.id);

        // 6. Record in notification_history for auditing and deduplication
        await supabaseAdmin.from("notification_history").insert({
          title: "Fee Due Reminder 💳",
          message: body,
          type: "fee_reminder",
          target_type: "fee_reminder",
          target_value: inst.id,
          sent_count: 1,
        });

        sentCount++;
      } catch (sendErr) {
        console.error(`[cron/fee-reminders] Failed for installment ${inst.id}:`, sendErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Fee reminders processed successfully.",
      total_checked: installments.length,
      reminders_sent: sentCount,
      reminders_skipped: skippedCount,
    });
  } catch (error: unknown) {
    console.error("[cron/fee-reminders] Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
