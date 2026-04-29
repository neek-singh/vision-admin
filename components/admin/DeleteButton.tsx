"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { deleteCourse } from "@/app/actions/courses";
import { deleteBlog } from "@/app/actions/blogs";
import { deleteBatch } from "@/app/actions/batches";

type DeleteButtonProps = {
  id: string;
  table: "courses" | "blogs" | "gallery" | "admissions" | "batches";
  title?: string;
};

export default function DeleteButton({ id, table, title }: DeleteButtonProps) {
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
      alert("Deleted successfully");

      router.refresh();
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
      className="text-red-500 hover:text-red-700 font-bold text-sm disabled:opacity-50 flex items-center gap-1"
    >
      {isDeleting ? (
        <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
      ) : (
        "🗑️"
      )}
      Delete
    </button>
  );
}