import "server-only";
import webpush from "web-push";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(
      "mailto:support@visionit.com",
      publicKey,
      privateKey
    );
  } catch (err) {
    console.error("Failed to initialize webpush VAPID details:", err);
  }
}

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!publicKey || !privateKey) {
    console.warn("VAPID keys not configured, skipping push notification.");
    return { success: false, error: "VAPID keys not configured" };
  }

  const supabase = await createServerSupabaseClient();

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("user_id", userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return { success: false, error: "No subscriptions found" };
  }

  const results = await Promise.all(
    subscriptions.map(async (sub: { subscription: webpush.PushSubscription }) => {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify(payload)
        );
        return { success: true };
      } catch (err: unknown) {
        const webpushErr = err as { statusCode?: number; message?: string };
        if (webpushErr.statusCode === 410 || webpushErr.statusCode === 404) {
          // Subscription has expired or is no longer valid, delete it
          await supabase
            .from("push_subscriptions")
            .delete()
            .match({ user_id: userId, subscription: sub.subscription });
        }
        return { success: false, error: webpushErr.message || "Failed to send notification" };
      }
    })
  );

  return { success: true, results };
}
