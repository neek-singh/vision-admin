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
  return { success: true };
}
