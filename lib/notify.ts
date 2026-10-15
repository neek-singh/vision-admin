import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPushNotification } from "@/lib/push";

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  type?: string;
}

/**
 * Core notification dispatcher that:
 * 1. Inserts record into `notifications` (master record)
 * 2. Links recipients into `user_notifications`
 * 3. Dispatches Web Push notifications in parallel
 * 4. Catches errors so caller actions never fail
 */
async function dispatchNotifications(
  userIds: string[],
  payload: NotificationPayload
): Promise<{ success: boolean; deliveredCount: number }> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { success: true, deliveredCount: 0 };
  }

  try {
    // 1. Create master notification record
    const { data: masterNotification, error: masterError } = await supabaseAdmin
      .from("notifications")
      .insert({
        title: payload.title,
        message: payload.body,
        type: payload.type || "alert",
      })
      .select("id")
      .single();

    if (masterError || !masterNotification) {
      console.error("[notify] Error creating master notification:", masterError);
    } else {
      // 2. Link each recipient in user_notifications table
      const userLinks = uniqueIds.map((userId) => ({
        user_id: userId,
        notification_id: masterNotification.id,
        is_read: false,
      }));

      const { error: linkError } = await supabaseAdmin
        .from("user_notifications")
        .insert(userLinks);

      if (linkError) {
        console.error("[notify] Error inserting user_notifications:", linkError);
      }
    }
  } catch (dbErr) {
    console.error("[notify] Database error while storing notification:", dbErr);
  }

  // 3. Send Web Push to all recipients in parallel (fail-safe)
  try {
    const pushPromises = uniqueIds.map(async (userId) => {
      try {
        await sendPushNotification(userId, {
          title: payload.title,
          body: payload.body,
          url: payload.url,
        });
      } catch (pushErr) {
        console.error(`[notify] Push delivery failed for user ${userId}:`, pushErr);
      }
    });

    await Promise.allSettled(pushPromises);
  } catch (err) {
    console.error("[notify] Unexpected error during push dispatch:", err);
  }

  return { success: true, deliveredCount: uniqueIds.length };
}

/**
 * Sends notification and push to all registered admins
 */
export async function notifyAdmins(payload: NotificationPayload) {
  try {
    const { data: admins, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (error || !admins || admins.length === 0) {
      console.warn("[notifyAdmins] No admin profiles found.");
      return { success: true, deliveredCount: 0 };
    }

    const adminIds = admins.map((a: { id: string }) => a.id);
    return await dispatchNotifications(adminIds, payload);
  } catch (err) {
    console.error("[notifyAdmins] Error:", err);
    return { success: false, deliveredCount: 0 };
  }
}

/**
 * Sends notification and push to multiple students
 */
export async function notifyStudents(
  studentIds: string[],
  payload: NotificationPayload
) {
  try {
    return await dispatchNotifications(studentIds, payload);
  } catch (err) {
    console.error("[notifyStudents] Error:", err);
    return { success: false, deliveredCount: 0 };
  }
}

/**
 * Sends notification and push to a single student
 */
export async function notifyStudent(
  studentId: string,
  payload: NotificationPayload
) {
  return await notifyStudents([studentId], payload);
}
