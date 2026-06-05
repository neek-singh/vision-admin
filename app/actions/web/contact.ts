"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function submitContactForm(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!name || !phone) {
    return { error: "Name and phone number are required." };
  }

  const { error } = await supabase
    .from("contacts")
    .insert([{ name, phone, email: email || null, message: message || null }]);

  if (error) {
    console.error("Contact form error:", error);
    return { error: "Failed to submit. Please try again or contact us directly on WhatsApp." };
  }

  revalidatePath("/contact");

  // Send push notification to all admins asynchronously (do not block client response)
  try {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const { sendPushNotification } = await import("@/app/actions/lms/push");
      const previewMsg = message 
        ? (message.length > 60 ? `${message.substring(0, 60)}...` : message) 
        : "No message details provided.";

      // Send to all admins concurrently
      await Promise.all(
        admins.map(async (admin) => {
          try {
            await sendPushNotification(admin.id, {
              title: "New Website Enquiry 🌐",
              body: `${name} (${phone}) sent: "${previewMsg}"`,
              url: "/admin/contacts"
            });
          } catch (err) {
            console.error(`Failed to send push to admin ${admin.id}:`, err);
          }
        })
      );
    }
  } catch (err) {
    console.error("Failed to process admin push notifications for enquiry:", err);
  }

  return { success: true };
}
