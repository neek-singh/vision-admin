"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
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
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("expenses").insert({
    title: data.title,
    amount: data.amount,
    category: data.category,
    expense_date: data.expense_date,
    description: data.description || "",
    paid_to: data.paid_to || "",
    payment_mode: data.payment_mode
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/expenses");
  return { success: true };
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
  const supabase = await createServerSupabaseClient();

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

  if (error) return { error: error.message };

  revalidatePath("/admin/expenses");
  return { success: true };
}

export async function deleteExpense(id: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/expenses");
  return { success: true };
}
