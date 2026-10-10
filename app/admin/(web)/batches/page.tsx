import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import BatchListClient from "@/components/web/BatchListClient";
import { Plus } from "lucide-react";

export const unstable_instant = false;

export default async function BatchesPage() {
  const supabase = await createServerSupabaseClient();

  const { data: batches } = await supabase
    .from("batches")
    .select(`
      *,
      courses(id, title)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto px-6 lg:px-8 py-10 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Batches</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage student cohorts linked to courses.</p>
        </div>
        <Link
          href="/admin/batches/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          New batch
        </Link>
      </div>

      <BatchListClient batches={batches || []} />
    </div>
  );
}
