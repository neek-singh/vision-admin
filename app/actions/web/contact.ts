"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/require-admin";
import { sendPushNotification } from "@/lib/push";

export async function deleteContact(id: string) {
  try {
    const { supabase: adminSupabase } = await requireAdmin();
    const { error } = await adminSupabase
      .from("contacts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("deleteContact DB error:", error);
      return { error: "Failed to delete contact" };
    }

    revalidatePath("/admin/contacts");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to delete contact:", e);
    return { error: e.message || "Unauthorized" };
  }
}

export async function submitContactForm(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  // Basic validation (T1.4)
  if (!name || name.length > 100) {
    return { error: "Please provide a valid name (max 100 characters)." };
  }
  if (!phone || phone.length > 20) {
    return { error: "Please provide a valid phone number (max 20 digits)." };
  }
  if (email && email.length > 100) {
    return { error: "Email address is too long (max 100 characters)." };
  }
  if (message && message.length > 1000) {
    return { error: "Message is too long (max 1000 characters)." };
  }

  const { error } = await supabase
    .from("contacts")
    .insert([{
      name,
      phone,
      email: email || null,
      message: message || null
    }]);

  if (error) {
    console.error("Contact form error:", error);
    return { error: "Failed to submit. Please try again or contact us directly on WhatsApp." };
  }

  revalidatePath("/contact");

  // Send push notification to all admins asynchronously
  try {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const previewMsg = message 
        ? (message.length > 60 ? `${message.substring(0, 60)}...` : message) 
        : "No message details provided.";

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
