"use server";

import { requireAdmin } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";

export async function addExpense(data: {
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  description?: string;
  paid_to?: string;
  payment_mode: string;
}) {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("expenses").insert({
      title: data.title,
      amount: data.amount,
      category: data.category,
      expense_date: data.expense_date,
      description: data.description || "",
      paid_to: data.paid_to || "",
      payment_mode: data.payment_mode
    });

    if (error) {
      console.error("addExpense error:", error);
      return { error: "Failed to add expense" };
    }

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: any) {
    console.error("addExpense auth error:", err);
    return { error: err.message || "Unauthorized" };
  }
}

export async function updateExpense(
  id: string,
  data: {
    title: string;
    amount: number;
    category: string;
    expense_date: string;
    description?: string;
    paid_to?: string;
    payment_mode: string;
  }
) {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("expenses")
      .update({
        title: data.title,
        amount: data.amount,
        category: data.category,
        expense_date: data.expense_date,
        description: data.description || "",
        paid_to: data.paid_to || "",
        payment_mode: data.payment_mode
      })
      .eq("id", id);

    if (error) {
      console.error("updateExpense error:", error);
      return { error: "Failed to update expense" };
    }

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: any) {
    console.error("updateExpense auth error:", err);
    return { error: err.message || "Unauthorized" };
  }
}

export async function deleteExpense(id: string) {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("deleteExpense error:", error);
      return { error: "Failed to delete expense" };
    }

    revalidatePath("/admin/expenses");
    return { success: true };
  } catch (err: any) {
    console.error("deleteExpense auth error:", err);
    return { error: err.message || "Unauthorized" };
  }
}
