import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/require-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    // 1. Auth & Admin Role Check
    try {
      await requireAdmin();
    } catch (authErr: any) {
      return NextResponse.json({ error: authErr.message || "Unauthorized" }, { status: 401 });
    }

    const { name, course, email, phone, password } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    let courseData = null;
    if (course && typeof course === "string") {
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(course);
      if (isUuid) {
        const { data } = await supabaseAdmin
          .from("courses")
          .select("id, course_code, title, fee, discount_fee")
          .eq("id", course)
          .limit(1)
          .maybeSingle();
        courseData = data;
      } else {
        // Sanitize course input against PostgREST filter injection (T6.4)
        const cleanCourse = course.replace(/[,()\\%*]/g, "").trim();
        
        // Exact matches first
        const { data: exactCode } = await supabaseAdmin
          .from("courses")
          .select("id, course_code, title, fee, discount_fee")
          .ilike("course_code", cleanCourse)
          .limit(1)
          .maybeSingle();

        if (exactCode) {
          courseData = exactCode;
        } else {
          const { data: exactTitle } = await supabaseAdmin
            .from("courses")
            .select("id, course_code, title, fee, discount_fee")
            .ilike("title", cleanCourse)
            .limit(1)
            .maybeSingle();

          if (exactTitle) {
            courseData = exactTitle;
          } else if (cleanCourse) {
            // Fuzzy search on title
            const { data: fuzzyTitle } = await supabaseAdmin
              .from("courses")
              .select("id, course_code, title, fee, discount_fee")
              .ilike("title", `%${cleanCourse}%`)
              .limit(1)
              .maybeSingle();
            courseData = fuzzyTitle;
          }
        }
      }
    }

    const year = new Date().getFullYear();
    const idPrefix = `VIT${year}STD`;

    // Robust ID generation with collision retry (T6.7)
    let studentId = "";
    let insertedStudent = null;

    // Password generation: custom or readable auto-generated
    const firstName = name.trim().split(" ")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "student";
    const rawPassword = (password && typeof password === "string" && password.trim().length >= 6)
      ? password.trim()
      : `${firstName}@123`;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: lastStudent } = await supabaseAdmin
        .from("students")
        .select("student_id")
        .ilike("student_id", `${idPrefix}%`)
        .order("student_id", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastStudent?.student_id) {
        const lastSeq = parseInt(lastStudent.student_id.replace(idPrefix, ""), 10);
        if (!isNaN(lastSeq)) nextNumber = lastSeq + 1 + attempt;
      } else {
        nextNumber += attempt;
      }

      studentId = `${idPrefix}${nextNumber.toString().padStart(3, "0")}`;

      const studentRecord: any = {
        student_id: studentId,
        name: name.trim(),
        email: email ? String(email).trim() : null,
        phone: phone ? String(phone).trim() : null,
        course: courseData ? courseData.title : (course || null),
        password_hash: passwordHash,
        status: "active",
      };

      let insertRes = await supabaseAdmin
        .from("students")
        .insert([studentRecord])
        .select();

      // If password_hash column not found, fallback to password
      if (insertRes.error && insertRes.error.message?.includes("password_hash")) {
        delete studentRecord.password_hash;
        studentRecord.password = passwordHash;
        insertRes = await supabaseAdmin
          .from("students")
          .insert([studentRecord])
          .select();
      }

      if (!insertRes.error && insertRes.data?.[0]) {
        insertedStudent = insertRes.data[0];
        break;
      }

      // If duplicate student_id, loop will try next sequential ID
      if (insertRes.error && !insertRes.error.message.includes("student_id")) {
        console.error("Student insert error:", insertRes.error);
        return NextResponse.json(
          { error: "Failed to insert student record." },
          { status: 500 }
        );
      }
    }

    if (!insertedStudent) {
      return NextResponse.json(
        { error: "Failed to allocate a unique Student ID. Please retry." },
        { status: 500 }
      );
    }

    // Create enrollment only if a valid course was found
    if (courseData) {
      await supabaseAdmin
        .from("enrollments")
        .insert([
          {
            student_id: insertedStudent.id,
            course_id: courseData.id,
            progress_percentage: 0,
          },
        ]);

      // Auto-create initial fee record so student portal shows accurate fee structure immediately
      const totalFee = Number(courseData.fee) || 10000;
      const discountFee = courseData.discount_fee ? Number(courseData.discount_fee) : totalFee;
      const discount = Math.max(0, totalFee - discountFee);

      await supabaseAdmin
        .from("fees")
        .insert([
          {
            student_id: insertedStudent.id,
            course_id: courseData.id,
            total_fee: totalFee,
            discount: discount,
            final_fee: discountFee,
            status: "pending",
          },
        ]);
    }

    return NextResponse.json({
      success: true,
      message: "Student registered successfully.",
      student: insertedStudent,
      credentials: {
        student_id: insertedStudent.student_id,
        password: rawPassword,
      },
    });
  } catch (error) {
    console.error("Student Registration API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
