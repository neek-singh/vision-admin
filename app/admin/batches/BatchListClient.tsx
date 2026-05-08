"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteBatch } from "@/app/actions/batches";
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
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    upcoming: "bg-blue-50 text-blue-700 border-blue-100",
    completed: "bg-slate-100 text-slate-500 border-slate-200",
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {["all", "active", "upcoming", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              filter === s
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {s === "all" ? `All (${batches.length})` : `${s} (${batches.filter(b => b.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Batch Grid */}
      {filteredBatches.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
          <Calendar size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold">No batches found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all p-6 group relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusColors[batch.status] || statusColors.active}`}>
                  {batch.status}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/admin/batches/${batch.id}/edit`}
                    className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Pencil size={16} />
                  </Link>
                  <button
                    onClick={() => handleDelete(batch.id, batch.title)}
                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{batch.title}</h3>
              {batch.courses?.title && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 mb-4">
                  <BookOpen size={12} />
                  {batch.courses.title}
                </div>
              )}

              <div className="space-y-2 text-xs text-slate-500 font-medium">
                {batch.faculty_name && (
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-slate-400" />
                    <span className="font-bold text-slate-600">{batch.faculty_name}</span>
                  </div>
                )}
                {batch.timing && (
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-slate-400" />
                    <span>{batch.timing}</span>
                  </div>
                )}
                {batch.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-slate-400" />
                    <span>
                      {new Date(batch.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {batch.end_date && ` — ${new Date(batch.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seats</span>
                  <span className="text-[10px] font-black text-slate-600">
                    {batch.available_seats}/{batch.max_seats} available
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
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
