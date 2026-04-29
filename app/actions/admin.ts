"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function updateAdmissionStatus(
    id: string,
    status: "approved" | "rejected"
) {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
        .from("admissions")
        .update({ status })
        .eq("id", id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/admin/admissions");

    return { success: true };
}