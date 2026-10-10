"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteBatch } from "@/app/actions/web/batches";
import { Trash2, Pencil, Calendar } from "lucide-react";

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const statusDot: Record<string, string> = {
  active: "bg-emerald-500",
  upcoming: "bg-blue-500",
  completed: "bg-slate-400",
};

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

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-5 border-b border-slate-200 dark:border-slate-800">
        {["all", "active", "upcoming", "completed"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`pb-3 -mb-px text-sm font-medium capitalize border-b-2 transition-colors ${
              filter === s
                ? "border-slate-900 dark:border-white text-slate-900 dark:text-white"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {s}{" "}
            <span className="text-slate-400 dark:text-slate-500">
              {s === "all" ? batches.length : batches.filter(b => b.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Batch List */}
      {filteredBatches.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No batches found</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Try changing the filter or create a new batch.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredBatches.map((batch) => {
            const taken = (batch.max_seats || 0) - (batch.available_seats || 0);
            const pct = Math.min(100, (taken / (batch.max_seats || 1)) * 100);
            const full = batch.available_seats === 0;

            return (
              <li
                key={batch.id}
                className="group flex flex-col md:flex-row md:items-center gap-3 md:gap-6 py-4 px-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
              >
                {/* Title + course */}
                <div className="flex items-start gap-3 md:flex-1 min-w-0">
                  <span
                    className={`mt-2 h-2 w-2 rounded-full shrink-0 ${statusDot[batch.status] || statusDot.active}`}
                    title={batch.status}
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {batch.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {(batch.courses as any)?.title || "No course"}
                      {batch.faculty_name && ` · ${batch.faculty_name}`}
                    </p>
                  </div>
                </div>

                {/* Schedule + duration */}
                <div className="text-xs text-slate-500 dark:text-slate-400 md:w-56 space-y-0.5 pl-5 md:pl-0">
                  {batch.timing && <p className="text-slate-700 dark:text-slate-300">{batch.timing}</p>}
                  {batch.start_date && (
                    <p>
                      {fmt(batch.start_date)}
                      {batch.end_date && ` – ${fmt(batch.end_date)}`}
                    </p>
                  )}
                </div>

                {/* Seats */}
                <div className="md:w-32 pl-5 md:pl-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {batch.available_seats}/{batch.max_seats}
                    </span>{" "}
                    seats left
                  </p>
                  <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${full ? "bg-red-500" : "bg-slate-900 dark:bg-slate-200"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pl-5 md:pl-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/admin/batches/${batch.id}/edit`}
                    className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors"
                    title="Edit Batch"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(batch.id, batch.title)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                    title="Delete Batch"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
