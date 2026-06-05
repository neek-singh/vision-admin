"use server";

import webpush from 'web-push';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const VAPID_PUBLIC_KEY = "BP7hk_L8r8pxtnHO2VU4eC993HFvS-jHv2nQta5YR9xG_9OvnsjietcQOKCmB49q2yPo_gJlTw9fvoWHz0A8OVg";
const VAPID_PRIVATE_KEY = "N6hBuzPgoxr4WRRbbcymoBgxqoe2nLKYlFF6hVw-ZYc";

webpush.setVapidDetails(
  'mailto:support@visionit.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function sendPushNotification(userId: string, payload: { title: string, body: string, url?: string }) {
  const supabase = await createServerSupabaseClient();

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  if (error || !subscriptions || subscriptions.length === 0) return { success: false, error: "No subscriptions found" };

  const results = await Promise.all(subscriptions.map(async (sub: any) => {
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify(payload)
      );
      return { success: true };
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription has expired or is no longer valid, should delete it
        await supabase
          .from('push_subscriptions')
          .delete()
          .match({ user_id: userId, subscription: sub.subscription });
      }
      return { success: false, error: error.message };
    }
  }));

  return { success: true, results };
}
