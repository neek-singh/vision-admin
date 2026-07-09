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

    const { name, course, email, phone } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    let courseData = null;
    if (course) {
      // Find matching course if provided
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(course);
      if (isUuid) {
        const { data } = await supabase
          .from("courses")
          .select("id, course_code, title")
          .eq("id", course)
          .limit(1)
          .maybeSingle();
        courseData = data;
      } else {
        // Fallback for non-UUID matching (try exact match first, then fuzzy)
        const { data: exactCode } = await supabase
          .from("courses")
          .select("id, course_code, title")
          .ilike("course_code", course)
          .limit(1)
          .maybeSingle();

        if (exactCode) {
          courseData = exactCode;
        } else {
          const { data: exactTitle } = await supabase
            .from("courses")
            .select("id, course_code, title")
            .ilike("title", course)
            .limit(1)
            .maybeSingle();

          if (exactTitle) {
            courseData = exactTitle;
          } else {
            const { data: fuzzy } = await supabase
              .from("courses")
              .select("id, course_code, title")
              .or(`course_code.ilike.%${course}%,title.ilike.%${course}%`)
              .limit(1)
              .maybeSingle();
            courseData = fuzzy;
          }
        }
      }
    }

    const year = new Date().getFullYear();
    const idPrefix = `VIT${year}STD`;

    // Robust ID generation: find the highest existing sequence, then +1
    const { data: lastStudent } = await supabase
      .from("students")
      .select("student_id")
      .ilike("student_id", `${idPrefix}%`)
      .order("student_id", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastStudent?.student_id) {
      const lastSeq = parseInt(lastStudent.student_id.replace(idPrefix, ""), 10);
      if (!isNaN(lastSeq)) nextNumber = lastSeq + 1;
    }

    const studentId = `${idPrefix}${nextNumber.toString().padStart(3, "0")}`;

    // Store a random unguessable hash — student cannot login until admin generates credentials
    const randomToken = crypto.randomUUID();
    const salt = await bcrypt.genSalt(10);
    const placeholderHash = await bcrypt.hash(randomToken, salt);

    const { data, error } = await supabase
      .from("students")
      .insert([
        {
          student_id: studentId,
          name,
          email,
          phone,
          course: courseData ? courseData.title : (course || null),
          password: placeholderHash,  // unguessable — credentials generated separately
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
