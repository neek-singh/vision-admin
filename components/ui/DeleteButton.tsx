"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { deleteCourse } from "@/app/actions/lms/courses";
import { deleteBlog } from "@/app/actions/web/blogs";
import { deleteBatch } from "@/app/actions/web/batches";
import { Trash2, Loader2 } from "lucide-react";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    const confirmDelete = confirm(
      `Delete ${title ? `"${title}"` : "this item"}? This cannot be undone.`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);

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
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("id", id);
        if (error) throw error;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(err.message || "Delete failed. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className={className || "text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium text-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition-colors"}
      title={title ? `Delete "${title}"` : "Delete"}
    >
      {isDeleting ? (
        <Loader2 size={14} className="animate-spin text-rose-500" />
      ) : (
        <Trash2 size={14} />
      )}
      {showText && (isDeleting ? "Deleting..." : "Delete")}
    </button>
  );
}
