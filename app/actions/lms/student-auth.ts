"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function loginStudent(formData: FormData) {
  const student_id = formData.get("student_id") as string;
  const password = formData.get("password") as string;

  if (!student_id || !password) {
    return { error: "Please provide both Student ID and Password." };
  }

  const supabase = await createServerSupabaseClient();

  // 1. Fetch student by student_id
  const { data: student, error } = await supabase
    .from("students")
    .select("*")
    .eq("student_id", student_id)
    .single();

  if (error || !student) {
    return { error: "Invalid Student ID or Password." };
  }

  // 1.5 Check if student is active
  if (student.status && student.status !== "active") {
    return { error: "Your account is currently inactive. Please contact administrator." };
  }

  // 2. Compare password
  const isMatch = await bcrypt.compare(password, student.password_hash);

  if (!isMatch) {
    return { error: "Invalid Student ID or Password." };
  }

  // 3. Set session cookie (simple version)
  const cookieStore = await cookies();
  cookieStore.set("student_session", JSON.stringify({
    id: student.id,
    student_id: student.student_id,
    name: student.name
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/"
  });

  return { success: true };
}

export async function logoutStudent() {
  const cookieStore = await cookies();
  cookieStore.delete("student_session");
  return { success: true };
}

export async function getStudentSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("student_session");
  if (!session) return null;
  
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}
