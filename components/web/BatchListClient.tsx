"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteBatch } from "@/app/actions/web/batches";
import { Trash2, Pencil, Users, Calendar, Clock, BookOpen } from "lucide-react";

export default function BatchListClient({ batches }: { batches: any[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");

  const filteredBatches = filter === "all"
    ? batches
    : batches.filter(b => b.status === filter);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete batch "${title}"? This cannot be undone.`)) return;

    const result = await deleteBatch(id);
    if (result.error) {
      alert("Error: " + result.error);
    } else {
      router.refresh();
    }
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
    upcoming: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
    completed: "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/50",
  };

  const statusBarColors: Record<string, string> = {
    active: "from-emerald-500 to-teal-400",
    upcoming: "from-blue-500 to-indigo-500",
    completed: "from-slate-400 to-slate-500",
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-800/80 shadow-inner">
        {["all", "active", "upcoming", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 active:scale-95 ${
              filter === s
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/20 dark:border-slate-700/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {s === "all" ? `All (${batches.length})` : `${s} (${batches.filter(b => b.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Batch Grid */}
      {filteredBatches.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
          <Calendar size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-4 animate-bounce" />
          <p className="text-slate-400 dark:text-slate-500 font-black text-sm uppercase tracking-widest">No batches found</p>
          <p className="text-slate-400 dark:text-slate-600 text-xs mt-1">Try changing the status filter or create a new batch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-xl dark:hover:shadow-slate-950/50 hover:-translate-y-1 transition-all duration-300 p-6 group relative overflow-hidden flex flex-col justify-between"
            >
              {/* Dynamic top gradient bar based on status */}
              <div className={`absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r ${statusBarColors[batch.status] || statusBarColors.active}`} />

              <div>
                {/* Header: Status and Admin Actions */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusColors[batch.status] || statusColors.active}`}>
                    {batch.status}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Link
                      href={`/admin/batches/${batch.id}/edit`}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-all"
                      title="Edit Batch"
                    >
                      <Pencil size={14} />
                    </Link>
                    <button
                      onClick={() => handleDelete(batch.id, batch.title)}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-all"
                      title="Delete Batch"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Batch Title */}
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {batch.title}
                </h3>

                {/* Course Name Tag */}
                {(batch.courses as any)?.title && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mb-5 bg-blue-50/50 dark:bg-blue-950/20 px-2.5 py-1 rounded-lg border border-blue-100/30 dark:border-blue-900/20 max-w-full">
                    <BookOpen size={12} className="shrink-0" />
                    <span className="truncate">{(batch.courses as any).title}</span>
                  </div>
                )}

                {/* Details Section */}
                <div className="space-y-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {batch.faculty_name && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg shrink-0 border border-slate-100/50 dark:border-slate-700/30">
                        <Users size={12} className="text-slate-450 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase tracking-widest font-black leading-none mb-0.5">Faculty</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate block">{batch.faculty_name}</span>
                      </div>
                    </div>
                  )}
                  {batch.timing && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg shrink-0 border border-slate-100/50 dark:border-slate-700/30">
                        <Clock size={12} className="text-slate-450 dark:text-slate-400" />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase tracking-widest font-black leading-none mb-0.5">Schedule</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">{batch.timing}</span>
                      </div>
                    </div>
                  )}
                  {batch.start_date && (
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg shrink-0 border border-slate-100/50 dark:border-slate-700/30">
                        <Calendar size={12} className="text-slate-450 dark:text-slate-400" />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block uppercase tracking-widest font-black leading-none mb-0.5">Duration</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">
                          {new Date(batch.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {batch.end_date && ` — ${new Date(batch.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Seats Progress Section */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Seats</span>
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">
                    {batch.available_seats}/{batch.max_seats} available
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/10 dark:border-slate-800/30">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                      batch.available_seats === 0
                        ? "from-rose-500 to-red-500"
                        : batch.available_seats / batch.max_seats < 0.25
                        ? "from-amber-500 to-orange-500"
                        : "from-blue-600 to-indigo-500"
                    }`}
                    style={{ width: `${((batch.max_seats - batch.available_seats) / (batch.max_seats || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
