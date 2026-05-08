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

    const { name, course, password, email, phone } = await request.json();

    if (!name || !password) {
      return NextResponse.json(
        { error: "Name and Password are required." },
        { status: 400 }
      );
    }

    let courseData = null;
    if (course) {
      // Find matching course if provided
      const { data } = await supabase
        .from("courses")
        .select("id, course_code")
        .or(`course_code.ilike.%${course}%,title.ilike.%${course}%`)
        .limit(1)
        .single();
      courseData = data;
    }

    const year = new Date().getFullYear();
    const idPrefix = `VIT${year}STD`;
    
    // Count existing students with this year and STD prefix to get the next number
    const { count } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .ilike("student_id", `${idPrefix}%`);
    
    const nextNumber = (count || 0) + 1;
    const sequence = nextNumber.toString().padStart(3, "0");
    const studentId = `${idPrefix}${sequence}`;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from("students")
      .insert([
        {
          student_id: studentId,
          name,
          email,
          phone,
          course: course || null,
          password: passwordHash,
          status: "active",
        },
      ])
      .select();

    if (error) {
      console.error("Database insertion error details:", error);
      return NextResponse.json(
        { error: `Database insertion error: ${error.message}` },
        { status: 500 }
      );
    }

    // Create enrollment only if a valid course was found
    if (courseData) {
      await supabase
        .from("enrollments")
        .insert([
          {
            student_id: data[0].id,
            course_id: courseData.id,
            progress_percentage: 0,
          },
        ]);
    }

    return NextResponse.json({
      success: true,
      message: "Student registered successfully.",
      student: data[0],
    });
  } catch (error) {
    console.error("Student Registration API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
