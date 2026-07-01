import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role Check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { studentDbId, customPassword } = await request.json();

    if (!studentDbId) {
      return NextResponse.json({ error: "studentDbId is required." }, { status: 400 });
    }

    // Fetch student details
    const { data: student, error: fetchError } = await supabase
      .from("students")
      .select("id, student_id, name, phone")
      .eq("id", studentDbId)
      .single();

    if (fetchError || !student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    // Generate password: custom or auto (FirstName@Last4)
    let rawPassword = customPassword;
    if (!rawPassword) {
      const firstName = student.name.trim().split(" ")[0];
      const last4 = (student.phone || "0000").slice(-4);
      rawPassword = `${firstName}@${last4}`;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // Update student: set password (has_credentials tracked via session state)
    const { error: updateError } = await supabase
      .from("students")
      .update({ password: passwordHash })
      .eq("id", studentDbId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update credentials: ${updateError.message}` },
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
