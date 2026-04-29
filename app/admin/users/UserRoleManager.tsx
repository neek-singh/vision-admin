"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function UserRoleManager({ userId, currentRole }: { userId: string, currentRole: string }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const toggleRole = async () => {
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    const confirmChange = confirm(`Change role for this user to ${newRole}?`);
    if (!confirmChange) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;
      router.refresh();
    } catch (err: any) {
      alert("Failed to update role: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      onClick={toggleRole}
      disabled={isUpdating}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
        currentRole === 'admin'
          ? 'text-indigo-600 border-indigo-100 hover:bg-indigo-50'
          : 'text-purple-600 border-purple-100 hover:bg-purple-50'
      } disabled:opacity-50`}
    >
      {isUpdating ? "..." : (currentRole === 'admin' ? "Make Student" : "Make Admin")}
    </button>
  );
}
