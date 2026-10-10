"use client";

import { useState } from "react";
import { X, UserMinus, Check, Loader2, AlertTriangle, Calendar, HelpCircle, FileText } from "lucide-react";
import { updateStudentAcademicStatus } from "@/app/actions/lms/admin";

interface StudentDropoutModalProps {
  student: any;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_REASONS = [
  "Financial / Fee Problem",
  "Job / Got Employment",
  "Relocated / Moved to Another City",
  "College / School Exams",
  "Health / Medical Issue",
  "Family / Personal Problem",
  "Distance / Commute Issue",
  "Course Discontinued / Shifted Course",
  "Disinterested / Lack of Time",
  "Other"
];

export default function StudentDropoutModal({ student, onClose, onSuccess }: StudentDropoutModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [statusType, setStatusType] = useState<"dropped_out" | "on_hold" | "completed">("dropped_out");
  const [dropoutDate, setDropoutDate] = useState(student.dropout_date || todayStr);
  const [reason, setReason] = useState(student.dropout_reason || COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [remarks, setRemarks] = useState(student.dropout_remarks || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalReason = reason === "Other" && customReason.trim() ? customReason.trim() : reason;

    try {
      const result = await updateStudentAcademicStatus({
        id: student.id,
        status: statusType,
        dropout_date: statusType === "completed" ? (student.dropout_date || null) : dropoutDate,
        dropout_reason: statusType === "completed" ? "Course Completed" : finalReason,
        dropout_remarks: remarks.trim() || null
      });

      if (result.error) throw new Error(result.error);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error updating student dropout status:", err);
      alert(err.message || "Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
              statusType === "dropped_out"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : statusType === "on_hold"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            }`}>
              <UserMinus size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Update Student Academic Status
              </h3>
              <p className="text-[10px] text-slate-400 leading-tight">
                {student.name} • ID: {student.student_id || "—"}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5">
          
          {/* Status Selection Pill Switcher */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Select Status Action
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStatusType("dropped_out")}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusType === "dropped_out"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Dropped Out
              </button>
              <button
                type="button"
                onClick={() => setStatusType("on_hold")}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusType === "on_hold"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                On Hold (Break)
              </button>
              <button
                type="button"
                onClick={() => setStatusType("completed")}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusType === "completed"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Status Policy Hint Notice */}
          <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs ${
            statusType === "dropped_out"
              ? "bg-rose-50/70 border-rose-200/80 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300"
              : statusType === "on_hold"
              ? "bg-amber-50/70 border-amber-200/80 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300"
              : "bg-blue-50/70 border-blue-200/80 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-300"
          }`}>
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              {statusType === "dropped_out" && (
                <span>
                  <strong>Dropout Rule:</strong> Future monthly fees and automatic SMS reminders will be stopped. Student will be excluded from active attendance rosters.
                </span>
              )}
              {statusType === "on_hold" && (
                <span>
                  <strong>On-Hold Rule:</strong> Student is on temporary leave (e.g. exams or personal break). Fees cycle paused until reactivated.
                </span>
              )}
              {statusType === "completed" && (
                <span>
                  <strong>Completion Rule:</strong> Marks the student as successfully finished. Certificate generation remains enabled.
                </span>
              )}
            </div>
          </div>

          {statusType !== "completed" && (
            <>
              {/* Effective Date */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar size={11} /> Effective Leaving Date
                </label>
                <input 
                  type="date"
                  required
                  value={dropoutDate}
                  onChange={(e) => setDropoutDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              {/* Reason Dropdown */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <HelpCircle size={11} /> Primary Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
                >
                  {COMMON_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                {reason === "Other" && (
                  <input
                    type="text"
                    required
                    placeholder="Specify other reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full mt-1.5 px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white"
                  />
                )}
              </div>
            </>
          )}

          {/* Remarks / Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
              <FileText size={11} /> Remarks / Internal Admin Note
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Informed on call, cleared 2 months fees, book returned..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-1.5 text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-98 disabled:opacity-50 ${
                statusType === "dropped_out"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : statusType === "on_hold"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={13} /> : <Check size={13} />}
              <span>
                {statusType === "dropped_out"
                  ? "Confirm Dropped Out"
                  : statusType === "on_hold"
                  ? "Put On Hold"
                  : "Mark Completed"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
