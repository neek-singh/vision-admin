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
  payment_date?: string;
  registration_fee?: number;
  course_fee?: number;
  exam_fee?: number;
}) {
  const supabase = await createServerSupabaseClient();

  // 1. Record transaction
  const { error: payError } = await supabase.from("payments").insert({
    fee_id: data.fee_id,
    student_id: data.student_id,
    amount: data.amount,
    payment_mode: data.payment_mode,
    transaction_id: data.transaction_id,
    payment_date: data.payment_date || new Date().toISOString().split('T')[0],
    registration_fee: data.registration_fee || 0,
    course_fee: data.course_fee || 0,
    exam_fee: data.exam_fee || 0
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

  // Trigger push notifications asynchronously (do not block client response)
  try {
    // 1. Fetch student profile to get the student's name
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.student_id)
      .single();
    
    const studentName = studentProfile?.full_name || "A student";

    // 2. Fetch all admins
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    const { sendPushNotification } = await import("@/app/actions/lms/push");

    // 3. Prepare notifications
    const notifyPromises = [];

    // Send confirmation to the student
    notifyPromises.push(
      sendPushNotification(data.student_id, {
        title: "Fee Payment Recorded 💳",
        body: `Thank you! Your payment of ₹${data.amount} has been successfully recorded.`,
        url: "/student/fees"
      }).catch(err => {
        console.error(`Failed to send push notification to student ${data.student_id}:`, err);
        return null;
      })
    );

    // Send notification to all admins
    if (admins && admins.length > 0) {
      admins.forEach(admin => {
        notifyPromises.push(
          sendPushNotification(admin.id, {
            title: "New Fee Payment Received 💰",
            body: `₹${data.amount} payment received from ${studentName} (${data.payment_mode}).`,
            url: "/admin/fees"
          }).catch(err => {
            console.error(`Failed to send push notification to admin ${admin.id}:`, err);
            return null;
          })
        );
      });
    }

    await Promise.all(notifyPromises);
  } catch (pushError) {
    console.error("Failed to process fee payment push notifications:", pushError);
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
