"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createStudentSession, destroyStudentSession, getStudentSession } from "@/lib/student-session";
import bcrypt from "bcryptjs";

export { getStudentSession };

export async function loginStudent(formData: FormData) {
  const student_id = (formData.get("student_id") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();

  if (!student_id || !password) {
    return { error: "Please provide both Student ID and Password." };
  }

  // Rate limiting check: max 5 failed attempts in last 15 minutes
  try {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: attempts } = await supabaseAdmin
      .from("student_login_attempts")
      .select("id")
      .eq("student_id", student_id)
      .eq("success", false)
      .gte("created_at", fifteenMinAgo);

    if (attempts && attempts.length >= 5) {
      return { error: "Too many failed login attempts. Please try again in 15 minutes." };
    }
  } catch (err) {
    // If student_login_attempts table is not yet created, proceed without crashing
  }

  // 1. Fetch student with get_student_for_auth RPC
  let student: any = null;
  const { data: students, error: rpcErr } = await supabaseAdmin.rpc("get_student_for_auth", {
    p_student_id: student_id,
  });

  if (students && students.length > 0) {
    student = students[0];
  } else {
    // Fallback direct select
    const { data: s } = await supabaseAdmin
      .from("students")
      .select("id, student_id, name, status, password_hash, is_blocked, is_deleted")
      .eq("student_id", student_id)
      .single();
    student = s;
  }

  if (!student || student.is_deleted || student.is_blocked) {
    // Record failed attempt
    try {
      await supabaseAdmin.from("student_login_attempts").insert({
        student_id,
        success: false,
      });
    } catch {}
    return { error: "Invalid Student ID or Password." };
  }

  // Check if student is active
  if (student.status && student.status !== "active") {
    return { error: "Your account is currently inactive. Please contact administrator." };
  }

  if (!student.password_hash) {
    return { error: "Invalid Student ID or Password." };
  }

  // 2. Compare password
  const isMatch = await bcrypt.compare(password, student.password_hash);

  if (!isMatch) {
    // Record failed attempt
    try {
      await supabaseAdmin.from("student_login_attempts").insert({
        student_id,
        success: false,
      });
    } catch {}
    return { error: "Invalid Student ID or Password." };
  }

  // 3. Record successful login attempt
  try {
    await supabaseAdmin.from("student_login_attempts").insert({
      student_id,
      success: true,
    });
  } catch {}

  // 4. Create cryptographically signed student session (T3.3)
  await createStudentSession({
    id: student.id,
    student_id: student.student_id,
    name: student.name,
  });

  return { success: true };
}

export async function logoutStudent() {
  await destroyStudentSession();
  return { success: true };
}
