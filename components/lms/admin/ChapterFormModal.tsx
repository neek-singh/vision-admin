"use client";

import { useState, useEffect } from "react";
import { X, Loader2, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MultiSelect from "@/components/ui/MultiSelect";

interface ChapterFormModalProps {
  courseId: string;
  moduleId: string;
  onClose: () => void;
  onSuccess: () => void;
  currentChaptersCount: number;
  isEditing?: boolean;
  chapterId?: string;
  initialData?: any;
  mode: "global" | "batch";
  selectedBatchId?: string;
  availableBatches: any[];
}

export default function ChapterFormModal({ 
  courseId, 
  moduleId,
  onClose, 
  onSuccess,
  currentChaptersCount,
  isEditing = false,
  chapterId,
  initialData,
  mode,
  selectedBatchId,
  availableBatches = []
}: ChapterFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [isGlobal, setIsGlobal] = useState(
    initialData ? (!initialData.batches || initialData.batches.length === 0) : (mode === "global")
  );
  const [batches, setBatches] = useState<string[]>(
    initialData?.batches || 
    (mode === "batch" && selectedBatchId ? [selectedBatchId] : [])
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId || !moduleId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        module_id: moduleId,
        course_id: courseId,
        title: title.trim(),
        batches: isGlobal ? [] : batches,
        order_index: isEditing ? initialData?.order_index : (currentChaptersCount + 1)
      };

      let error;
      if (isEditing && chapterId) {
        const { error: updateError } = await supabase
          .from("lms_chapters")
          .update(payload)
          .eq("id", chapterId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("lms_chapters")
          .insert(payload);
        error = insertError;
      }

      if (!error) {
        onSuccess();
      } else {
        alert("Error saving chapter: " + error.message);
      }
    } catch (err) {
      console.error("Error saving chapter:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {isEditing ? "Edit Chapter" : "New Chapter"}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Group lessons and topics inside this module
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Chapter Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Chapter Title <span className="text-rose-500">*</span>
            </label>
            <input 
              autoFocus 
              required 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Basics of Programming" 
              className="w-full h-10 px-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
            />
          </div>

          {/* Global Toggle Card */}
          <label 
            htmlFor="is_global_chapter"
            className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer transition-all select-none"
          >
            <div className="pt-0.5">
              <input 
                type="checkbox" 
                id="is_global_chapter"
                checked={isGlobal}
                onChange={(e) => {
                  setIsGlobal(e.target.checked);
                  if (e.target.checked) setBatches([]);
                }}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer accent-indigo-600"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Global Chapter
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  All Batches
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                Visible to all current and future batches in this course.
              </p>
            </div>
          </label>

          {/* Batch Selector if not global */}
          {!isGlobal && (
            <div className="space-y-1.5 pt-1">
              <MultiSelect 
                label="Assign to Specific Batches"
                options={availableBatches.map(b => ({ value: b.id, label: b.batch_display }))}
                selected={batches}
                onChange={setBatches}
              />
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Create Chapter"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
