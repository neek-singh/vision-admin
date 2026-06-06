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

export default function DeleteButton({ id, table, title, onSuccess, showText = true, className }: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    const confirmDelete = confirm(
      `Delete ${title ? `"${title}"` : "this item"}?`
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
      } else {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("id", id);

        if (error) throw error;
      }

      // ✅ success feedback
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className={className || "text-red-500 hover:text-red-700 font-bold text-sm disabled:opacity-50 flex items-center gap-1 cursor-pointer"}
      title={title ? `Delete "${title}"` : "Delete"}
    >
      {isDeleting ? (
        <Loader2 size={14} className="animate-spin text-red-500" />
      ) : (
        <Trash2 size={14} />
      )}
      {showText && "Delete"}
    </button>
  );
}
