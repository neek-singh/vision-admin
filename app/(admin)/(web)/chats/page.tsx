import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import WebChatsClient from "@/components/web/WebChatsClient";
import { MessageSquare } from "lucide-react";

export const unstable_instant = false;

const PAGE_SIZE = 10;

export default async function WebChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/unauthorized");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Fetch contacts with pagination
  const { data: contacts, count } = await supabase
    .from("contacts")
    .select("id, name, email, phone, message, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-orange-500" />
            Web Enquiries Chat
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Reply to website contact form enquiries · {count || 0} total threads
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Page {page} of {totalPages || 1}
        </div>
      </div>

      {/* Chat UI (client component) */}
      <WebChatsClient
        contacts={contacts || []}
        page={page}
        totalPages={totalPages}
        totalCount={count || 0}
      />
    </div>
  );
}
