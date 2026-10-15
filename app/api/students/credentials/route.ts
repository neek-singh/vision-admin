import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/require-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    // 1. Verify caller is an authenticated admin
    try {
      await requireAdmin();
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Unauthorized" }, { status: 401 });
    }

    const { studentDbId, customPassword } = await request.json();

    if (!studentDbId) {
      return NextResponse.json({ error: "studentDbId is required." }, { status: 400 });
    }

    // Validate customPassword if provided (T3.6)
    if (customPassword) {
      if (typeof customPassword !== "string" || customPassword.length < 8) {
        return NextResponse.json(
          { error: "Custom password must be at least 8 characters long." },
          { status: 400 }
        );
      }
    }

    // 2. Fetch student details with privileged client
    const { data: student, error: fetchError } = await supabaseAdmin
      .from("students")
      .select("id, student_id, name, phone")
      .eq("id", studentDbId)
      .single();

    if (fetchError || !student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    // 3. Generate password: custom or cryptographically random (T3.6)
    const rawPassword = customPassword || randomBytes(6).toString("base64url"); // ~8 chars

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // 4. Update student: set password_hash (T3.2)
    // We try password_hash first, and fall back to password if table column not yet renamed
    let { error: updateError } = await supabaseAdmin
      .from("students")
      .update({ password_hash: passwordHash })
      .eq("id", studentDbId);

    if (updateError && updateError.message?.includes("password_hash")) {
      const fallback = await supabaseAdmin
        .from("students")
        .update({ password: passwordHash })
        .eq("id", studentDbId);
      updateError = fallback.error;
    }

    if (updateError) {
      console.error("Credentials update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update student credentials." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Credentials generated successfully.",
      credentials: {
        student_id: student.student_id,
        password: rawPassword,
      },
    });
  } catch (error) {
    console.error("Generate Credentials API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
