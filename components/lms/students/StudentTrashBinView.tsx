"use client";

import { useState } from "react";
import { 
  Trash2, 
  RotateCcw, 
  ArrowLeft, 
  AlertTriangle, 
  Search, 
  Loader2, 
  User, 
  Calendar, 
  CheckCircle2, 
  X,
  AlertCircle
} from "lucide-react";

interface StudentTrashBinViewProps {
  trashedStudents: any[];
  onRestore: (student: any) => Promise<void>;
  onPermanentDelete: (student: any) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
  onBulkRestore: (ids: string[]) => Promise<void>;
  onBack: () => void;
  isUpdating: string | null;
  isBulkUpdating: boolean;
}

export default function StudentTrashBinView({
  trashedStudents,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
  onBulkRestore,
  onBack,
  isUpdating,
  isBulkUpdating
}: StudentTrashBinViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmingPermanent, setConfirmingPermanent] = useState<any | null>(null);

  // Filter trashed students by search
  const filtered = trashedStudents.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name?.toLowerCase().includes(q) ||
      s.student_id?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const formatDeletedDate = (dateStr?: string) => {
    if (!dateStr) return "Recently";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Back to Active Students"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Trash2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Trash Bin (Recycle Bin)
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                  {trashedStudents.length} {trashedStudents.length === 1 ? "student" : "students"}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Deleted students are safely archived here. Restore anytime or delete permanently.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onBulkRestore(selectedIds)}
              disabled={isBulkUpdating}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isBulkUpdating ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              <span>Restore Selected ({selectedIds.length})</span>
            </button>
          )}

          {trashedStudents.length > 0 && (
            <button
              type="button"
              onClick={onEmptyTrash}
              disabled={isBulkUpdating}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isBulkUpdating ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              <span>Empty Trash</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Policy Hint Alert ── */}
      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 text-xs flex items-start gap-2.5">
        <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="leading-relaxed text-[11px]">
          <strong>Soft Delete Policy:</strong> Trashed students are hidden from active enrollment, batches, and daily fee ledgers, but their past payment history remains preserved in the database. Clicking <strong>Restore</strong> puts them back into active status with zero data loss.
        </div>
      </div>

      {/* ── Search Bar ── */}
      {trashedStudents.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search deleted students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200 shadow-2xs"
          />
        </div>
      )}

      {/* ── Trashed List / Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {trashedStudents.length === 0 ? "Trash Bin is completely empty" : "No matching students found"}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {trashedStudents.length === 0 
                  ? "No deleted students currently. Deleted students will appear here safely for easy restoration."
                  : "Try clearing your search term."}
              </p>
            </div>
            {trashedStudents.length === 0 && (
              <button
                type="button"
                onClick={onBack}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Return to Active Students</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-3.5 py-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-3.5 py-2.5">Student</th>
                  <th className="px-3.5 py-2.5">Student ID</th>
                  <th className="px-3.5 py-2.5">Contact</th>
                  <th className="px-3.5 py-2.5">Course</th>
                  <th className="px-3.5 py-2.5">Deleted On</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filtered.map((student) => {
                  const isBusy = isUpdating === student.id;
                  const isSelected = selectedIds.includes(student.id);

                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${
                        isSelected ? "bg-rose-50/20 dark:bg-rose-950/15" : ""
                      }`}
                    >
                      <td className="px-3.5 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(student.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {student.photo_url ? (
                              <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={13} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block line-through opacity-80">
                              {student.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Father: {student.father_name || "—"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {student.student_id || "—"}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="text-[11px] text-slate-700 dark:text-slate-300">{student.phone || "—"}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{student.email || ""}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 font-medium">
                        {student.course || "—"}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" />
                          {formatDeletedDate(student.deleted_at)}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1-Click Restore Button */}
                          <button
                            type="button"
                            onClick={() => onRestore(student)}
                            disabled={isBusy}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            title="Restore to Active Students"
                          >
                            {isBusy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                            <span>Restore</span>
                          </button>

                          {/* Delete Forever Button */}
                          <button
                            type="button"
                            onClick={() => setConfirmingPermanent(student)}
                            disabled={isBusy}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Permanently Delete Forever"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Permanent Delete Double Confirmation Modal ── */}
      {confirmingPermanent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[110] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200/80 dark:border-rose-900/60 max-w-md w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Permanently Delete Student?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You are about to permanently erase <strong className="text-rose-600 dark:text-rose-400">{confirmingPermanent.name}</strong> (ID: {confirmingPermanent.student_id || "—"}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingPermanent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300 text-xs space-y-1">
              <span className="font-bold block">⚠️ This action CANNOT be undone:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700 dark:text-rose-300">
                <li>Profile, credentials, and admissions data will be removed.</li>
                <li>All linked fee dues and payment records will be permanently deleted.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmingPermanent(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const student = confirmingPermanent;
                  setConfirmingPermanent(null);
                  await onPermanentDelete(student);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Trash2 size={13} />
                <span>Yes, Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
