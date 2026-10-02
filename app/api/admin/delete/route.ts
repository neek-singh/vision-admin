import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getAdminSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
}

async function verifyAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

// DELETE — remove contact or message
export async function DELETE(req: NextRequest) {
  try {
    const { id, table } = await req.json();
    if (!id || !table) return NextResponse.json({ error: "Missing id or table" }, { status: 400 });

    const allowed = ["contacts", "admissions", "contact_messages"];
    if (!allowed.includes(table)) return NextResponse.json({ error: "Table not allowed" }, { status: 403 });

    const supabase = await getAdminSupabase();
    const adminUser = await verifyAdmin(supabase);
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/admin/contacts");
    revalidatePath("/admin/chats");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 500 });
  }
}

// POST — send message or update contact status/follow
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const supabase = await getAdminSupabase();
    const adminUser = await verifyAdmin(supabase);
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Send message
    if (action === "send_message") {
      const { contact_id, text, sender = "admin" } = body;
      if (!contact_id || !text) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

      const { data, error } = await supabase
        .from("contact_messages")
        .insert({ contact_id, sender, text })
        .select()
        .single();

      if (error) throw error;

      // Auto-update contact status to in_progress if it was new
      await supabase
        .from("contacts")
        .update({ status: "in_progress" })
        .eq("id", contact_id)
        .eq("status", "new");

      return NextResponse.json({ success: true, message: data });
    }

    // Toggle follow
    if (action === "toggle_follow") {
      const { contact_id, follow, note } = body;
      const { error } = await supabase
        .from("contacts")
        .update({
          is_followed: follow,
          followed_at: follow ? new Date().toISOString() : null,
          follow_note: note || null,
        })
        .eq("id", contact_id);

      if (error) throw error;
      revalidatePath("/admin/chats");
      return NextResponse.json({ success: true });
    }

    // Update status
    if (action === "update_status") {
      const { contact_id, status } = body;
      const { error } = await supabase
        .from("contacts")
        .update({ status })
        .eq("id", contact_id);

      if (error) throw error;
      revalidatePath("/admin/chats");
      return NextResponse.json({ success: true });
    }

    // Load messages
    if (action === "get_messages") {
      const { contact_id } = body;
      const { data, error } = await supabase
        .from("contact_messages")
        .select("id, sender, text, created_at")
        .eq("contact_id", contact_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return NextResponse.json({ success: true, messages: data || [] });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Request failed" }, { status: 500 });
  }
}
