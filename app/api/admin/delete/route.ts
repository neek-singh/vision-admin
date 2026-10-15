import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const ALLOWED_STATUSES = ["new", "in_progress", "closed", "resolved", "spam", "archived"];
const ALLOWED_TABLES = ["contacts", "admissions", "contact_messages"];

// DELETE — remove contact or message
export async function DELETE(req: NextRequest) {
  try {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, table } = await req.json();
    if (!id || !table) {
      return NextResponse.json({ error: "Missing id or table" }, { status: 400 });
    }

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid id format" }, { status: 400 });
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: "Table not allowed" }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
    if (error) {
      console.error("Delete error in admin route:", error);
      return NextResponse.json({ error: "Delete operation failed" }, { status: 500 });
    }

    revalidatePath("/admin/contacts");
    revalidatePath("/admin/chats");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE handler exception:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST — send message or update contact status/follow
export async function POST(req: NextRequest) {
  try {
    try {
      await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Send message (T5.2: sender always hardcoded to "admin")
    if (action === "send_message") {
      const { contact_id, text } = body;
      if (!contact_id || !text || typeof text !== "string") {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }

      if (!UUID_REGEX.test(contact_id)) {
        return NextResponse.json({ error: "Invalid contact ID format" }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from("contact_messages")
        .insert({
          contact_id,
          sender: "admin", // Hardcoded (never trust body)
          text: text.trim().slice(0, 2000),
        })
        .select()
        .single();

      if (error) {
        console.error("send_message insert error:", error);
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
      }

      // Auto-update contact status to in_progress if it was new
      await supabaseAdmin
        .from("contacts")
        .update({ status: "in_progress" })
        .eq("id", contact_id)
        .eq("status", "new");

      return NextResponse.json({ success: true, message: data });
    }

    // Toggle follow
    if (action === "toggle_follow") {
      const { contact_id, follow, note } = body;
      if (!contact_id || !UUID_REGEX.test(contact_id)) {
        return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("contacts")
        .update({
          is_followed: Boolean(follow),
          followed_at: follow ? new Date().toISOString() : null,
          follow_note: note ? String(note).slice(0, 500) : null,
        })
        .eq("id", contact_id);

      if (error) {
        console.error("toggle_follow error:", error);
        return NextResponse.json({ error: "Failed to update follow status" }, { status: 500 });
      }

      revalidatePath("/admin/chats");
      return NextResponse.json({ success: true });
    }

    // Update status (T5.2: whitelist validation)
    if (action === "update_status") {
      const { contact_id, status } = body;
      if (!contact_id || !UUID_REGEX.test(contact_id)) {
        return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
      }

      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("contacts")
        .update({ status })
        .eq("id", contact_id);

      if (error) {
        console.error("update_status error:", error);
        return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
      }

      revalidatePath("/admin/chats");
      return NextResponse.json({ success: true });
    }

    // Load messages
    if (action === "get_messages") {
      const { contact_id } = body;
      if (!contact_id || !UUID_REGEX.test(contact_id)) {
        return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from("contact_messages")
        .select("id, sender, text, created_at")
        .eq("contact_id", contact_id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("get_messages error:", error);
        return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
      }

      return NextResponse.json({ success: true, messages: data || [] });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST handler exception in admin route:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
