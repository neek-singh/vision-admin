"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { deleteCourse } from "@/app/actions/lms/courses";
import { deleteBlog } from "@/app/actions/web/blogs";
import { deleteBatch } from "@/app/actions/web/batches";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/Modal";

type DeleteButtonProps = {
  id: string;
  table: "courses" | "blogs" | "gallery" | "admissions" | "batches" | "contacts" | "lms_modules" | "lms_chapters" | "lessons" | "students";
  title?: string;
  onSuccess?: () => void;
  showText?: boolean;
  className?: string;
};

// Tables that need server-side delete (RLS restricted)
const SERVER_DELETE_TABLES = ["contacts", "admissions"];

async function deleteViaApi(id: string, table: string): Promise<{ error?: string }> {
  const res = await fetch("/api/admin/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, table }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error || "Delete failed" };
  return {};
}

export default function DeleteButton({ id, table, title, onSuccess, showText = true, className }: DeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleConfirmDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      if (table === "courses") {
        const result = await deleteCourse(id);
        if (result.error) throw new Error(result.error);
      } else if (table === "blogs") {
        const result = await deleteBlog(id);
        if (result.error) throw new Error(result.error);
      } else if (table === "batches") {
        const result = await deleteBatch(id);
        if (result.error) throw new Error(result.error);
      } else if (SERVER_DELETE_TABLES.includes(table)) {
        // Use API route for tables with RLS restrictions
        const result = await deleteViaApi(id, table);
        if (result.error) throw new Error(result.error);
      } else {
        const { error: dbError } = await supabase
          .from(table)
          .delete()
          .eq("id", id);
        if (dbError) throw dbError;
      }

      setIsOpen(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Delete failed. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  const defaultClasses = showText
    ? "text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium text-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition-colors min-h-[44px] px-2 py-2"
    : "p-2.5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50 cursor-pointer";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        disabled={isDeleting}
        className={className ? `min-h-[44px] ${!showText ? "min-w-[44px] inline-flex items-center justify-center " : ""}${className}` : defaultClasses}
        title={title ? `Delete "${title}"` : "Delete"}
        aria-label={!showText ? (title ? `Delete ${title}` : "Delete") : undefined}
      >
        {isDeleting ? (
          <Loader2 size={14} className="animate-spin text-rose-500" />
        ) : (
          <Trash2 size={14} />
        )}
        {showText && (isDeleting ? "Deleting..." : "Delete")}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsOpen(false);
            setError(null);
          }
        }}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete {title ? <span className="font-semibold text-slate-900 dark:text-white">"{title}"</span> : "this item"}? This action cannot be undone.
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setError(null);
              }}
              disabled={isDeleting}
              className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="min-h-[44px] px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
