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

    if (!name || !course || !password) {
      return NextResponse.json(
        { error: "Name, Course, and Password are required." },
        { status: 400 }
      );
    }

    // Find matching course
    const { data: courseData } = await supabase
      .from("courses")
      .select("id, course_code")
      .or(`course_code.ilike.%${course}%,title.ilike.%${course}%`)
      .limit(1)
      .single();

    if (!courseData) {
      return NextResponse.json(
        { error: `Course matching "${course}" not found. Please create the course first.` },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    const rawCourseCode = (courseData.course_code || "GEN").toUpperCase().replace(/\s+/g, "");
    const courseCode = rawCourseCode.length > 5 ? rawCourseCode.slice(0, 5) : rawCourseCode;
    
    // Count existing students for this year and course to get the next number
    const { count } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .ilike("student_id", `VIT-${year}${courseCode}%`);
    
    const nextNumber = (count || 0) + 1;
    const sequence = nextNumber.toString().padStart(4, "0");
    const studentId = `VIT-${year}${courseCode}${sequence}`;

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
          course,
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

    // Create enrollment
    await supabase
      .from("enrollments")
      .insert([
        {
          student_id: data[0].id,
          course_id: courseData.id,
          progress_percentage: 0,
        },
      ]);

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
