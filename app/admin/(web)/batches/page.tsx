import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import BatchListClient from "@/components/web/BatchListClient";

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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manage Batches</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Create and manage student cohorts linked to courses.</p>
        </div>
        <Link
          href="/admin/batches/new"
          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
        >
          + Create Batch
        </Link>
      </div>

      <BatchListClient batches={batches || []} />
    </div>
  );
}
