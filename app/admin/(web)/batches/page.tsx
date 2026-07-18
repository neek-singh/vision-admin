import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import BatchListClient from "@/components/web/BatchListClient";
import { Plus } from "lucide-react";

export const revalidate = 0;

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
    <div className="container mx-auto px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Manage Batches</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Create and manage student cohorts linked to courses.</p>
        </div>
        <Link
          href="/admin/batches/new"
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98]"
        >
          <Plus size={14} className="stroke-[3]" />
          Create Batch
        </Link>
      </div>

      <BatchListClient batches={batches || []} />
    </div>
  );
}
