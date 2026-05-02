"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function setupStudentFee(data: {
  student_id: string;
  course_id: string;
  total_fee: number;
  discount: number;
  final_fee: number;
  installments: { amount: number; due_date: string }[];
}) {
  const supabase = await createServerSupabaseClient();

  // 1. Create main fee record
  const { data: fee, error: feeError } = await supabase
    .from("fees")
    .insert({
      student_id: data.student_id,
      course_id: data.course_id,
      total_fee: data.total_fee,
      discount: data.discount,
      final_fee: data.final_fee,
      status: 'due'
    })
    .select()
    .single();

  if (feeError) return { error: feeError.message };

  // 2. Create installments
  if (data.installments.length > 0) {
    const installmentData = data.installments.map(inst => ({
      fee_id: fee.id,
      amount: inst.amount,
      due_date: inst.due_date,
      status: 'pending'
    }));

    const { error: instError } = await supabase.from("installments").insert(installmentData);
    if (instError) return { error: instError.message };
  }

  revalidatePath("/admin/fees");
  return { success: true };
}

export async function recordPayment(data: {
  fee_id: string;
  student_id: string;
  amount: number;
  payment_mode: string;
  transaction_id?: string;
}) {
  const supabase = await createServerSupabaseClient();

  // 1. Record transaction
  const { error: payError } = await supabase.from("payments").insert({
    fee_id: data.fee_id,
    student_id: data.student_id,
    amount: data.amount,
    payment_mode: data.payment_mode,
    transaction_id: data.transaction_id,
    payment_date: new Date().toISOString().split('T')[0]
  });

  if (payError) return { error: payError.message };

  // 2. Calculate Total Paid to update status
  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("fee_id", data.fee_id);

  const totalPaid = allPayments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;

  // 3. Update fee status
  const { data: fee } = await supabase.from("fees").select("final_fee").eq("id", data.fee_id).single();
  if (fee) {
    const finalFee = Number(fee.final_fee);
    let newStatus = 'partial';
    if (totalPaid >= finalFee) newStatus = 'paid';
    else if (totalPaid === 0) newStatus = 'due';

    await supabase.from("fees").update({
      status: newStatus
    }).eq("id", data.fee_id);

    // 4. Update installments status
    const { data: installments } = await supabase
      .from("installments")
      .select("*")
      .eq("fee_id", data.fee_id)
      .eq("status", "pending")
      .order("due_date", { ascending: true });

    if (installments) {
      let remainingPaid = totalPaid;
      for (const inst of installments) {
        if (remainingPaid >= Number(inst.amount)) {
          await supabase.from("installments").update({ status: 'paid' }).eq("id", inst.id);
          remainingPaid -= Number(inst.amount);
        } else {
          break;
        }
      }
    }
  }

  revalidatePath("/admin/fees");
  return { success: true };
}

export async function deleteFeeRecord(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("fees").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/fees");
  return { success: true };
}
