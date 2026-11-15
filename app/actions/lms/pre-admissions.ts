"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import bcrypt from "bcryptjs";

export interface EnrollPreAdmissionInput {
  studentUuid?: string;      // ID if user is in students table
  admissionId?: string;      // ID if user is in admissions table
  studentIdCode?: string;    // e.g. VIT001
  name: string;
  phone: string;
  email?: string | null;
  education?: string | null;
  courseId: string;
  batchTitle: string;
  totalFee: number;
  discountFee?: number;
  paidAmount?: number;
  paymentMode?: string;
}

export async function enrollPreAdmissionStudent(input: EnrollPreAdmissionInput) {
  try {
    const { supabase } = await requireAdmin();

    const {
      studentUuid,
      admissionId,
      studentIdCode,
      name,
      phone,
      email,
      courseId,
      batchTitle,
      totalFee,
      discountFee = 0,
      paidAmount = 0,
      paymentMode = "cash"
    } = input;

    if (!courseId) {
      return { error: "Please select a course to enroll." };
    }
    if (!batchTitle || !batchTitle.trim()) {
      return { error: "Please select or enter a batch." };
    }

    // 1. Fetch course details
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("id, title, course_code, fee, discount_fee")
      .eq("id", courseId)
      .single();

    if (courseError || !courseData) {
      return { error: "Selected course not found." };
    }

    const todayDate = new Date().toISOString().split("T")[0];
    let targetStudentUuid = studentUuid;
    let finalStudentIdCode = studentIdCode;

    // 2. Check if student already exists in `students` table
    if (!targetStudentUuid) {
      const cleanPhone = phone?.trim();
      if (cleanPhone) {
        const { data: existingStudent } = await supabase
          .from("students")
          .select("id, student_id")
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (existingStudent) {
          targetStudentUuid = existingStudent.id;
          finalStudentIdCode = existingStudent.student_id;
        }
      }
    }

    // 3. If student does NOT exist in `students`, create record
    if (!targetStudentUuid) {
      // Generate unique student ID code if not present
      if (!finalStudentIdCode) {
        const year = new Date().getFullYear();
        const prefix = `VIT${year}STD`;
        const { data: lastStudent } = await supabase
          .from("students")
          .select("student_id")
          .ilike("student_id", `${prefix}%`)
          .order("student_id", { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextNum = 1;
        if (lastStudent?.student_id) {
          const parsed = parseInt(lastStudent.student_id.replace(prefix, ""), 10);
          if (!isNaN(parsed)) nextNum = parsed + 1;
        }
        finalStudentIdCode = `${prefix}${nextNum.toString().padStart(3, "0")}`;
      }

      // Password is user's phone number or firstName@123
      const cleanPhone = phone?.trim();
      const rawPassword = cleanPhone && cleanPhone.length >= 6 ? cleanPhone : `${name.split(" ")[0].toLowerCase()}@123`;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(rawPassword, salt);

      const { data: newStudent, error: createStudentError } = await supabase
        .from("students")
        .insert({
          student_id: finalStudentIdCode,
          name: name.trim(),
          phone: cleanPhone || null,
          email: email?.trim() || null,
          education: input.education?.trim() || null,
          course: courseData.title,
          batch: batchTitle.trim(),
          password_hash: passwordHash,
          status: "active",
          admission_date: todayDate,
        })
        .select("id, student_id")
        .single();

      if (createStudentError || !newStudent) {
        console.error("Failed to create student during enrollment:", createStudentError);
        return { error: createStudentError?.message || "Failed to create student profile." };
      }

      targetStudentUuid = newStudent.id;
      finalStudentIdCode = newStudent.student_id;
    } else {
      // Update existing student record to active status with course & batch
      const { error: updateStudentError } = await supabase
        .from("students")
        .update({
          status: "active",
          course: courseData.title,
          batch: batchTitle.trim(),
          admission_date: todayDate,
        })
        .eq("id", targetStudentUuid);

      if (updateStudentError) {
        console.error("Failed to update student during enrollment:", updateStudentError);
      }
    }

    // 4. Create or update course enrollment
    const { data: existingEnrollment } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", targetStudentUuid)
      .eq("course_id", courseData.id)
      .maybeSingle();

    if (!existingEnrollment) {
      const { error: enrollError } = await supabase
        .from("enrollments")
        .insert({
          student_id: targetStudentUuid,
          course_id: courseData.id,
          batch: batchTitle.trim(),
          progress_percentage: 0,
        });

      if (enrollError) {
        console.error("Enrollment insert error:", enrollError);
      }
    } else {
      await supabase
        .from("enrollments")
        .update({ batch: batchTitle.trim() })
        .eq("id", existingEnrollment.id);
    }

    // 5. Create Fee Record
    const feeTotal = Number(totalFee) || Number(courseData.fee) || 0;
    const discount = Number(discountFee) || 0;
    const finalFee = Math.max(0, feeTotal - discount);
    const paid = Number(paidAmount) || 0;
    const feeStatus = paid >= finalFee ? "paid" : paid > 0 ? "partial" : "pending";

    // Check if fee record already exists for this student & course
    const { data: existingFee } = await supabase
      .from("fees")
      .select("id")
      .eq("student_id", targetStudentUuid)
      .eq("course_id", courseData.id)
      .maybeSingle();

    let feeId = existingFee?.id;

    if (!existingFee) {
      const { data: newFee, error: feeError } = await supabase
        .from("fees")
        .insert({
          student_id: targetStudentUuid,
          course_id: courseData.id,
          total_fee: feeTotal,
          discount: discount,
          final_fee: finalFee,
          status: feeStatus,
        })
        .select("id")
        .single();

      if (feeError) {
        console.error("Fee creation error:", feeError);
      } else {
        feeId = newFee?.id;
      }
    } else {
      await supabase
        .from("fees")
        .update({
          total_fee: feeTotal,
          discount: discount,
          final_fee: finalFee,
          status: feeStatus,
        })
        .eq("id", existingFee.id);
    }

    // 6. Record Payment if paidAmount > 0
    if (paid > 0 && feeId) {
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          student_id: targetStudentUuid,
          fee_id: feeId,
          amount: paid,
          payment_date: todayDate,
          payment_mode: paymentMode,
          registration_fee: paid,
          course_fee: 0,
          exam_fee: 0,
        });

      if (paymentError) {
        console.error("Payment insert error:", paymentError);
      }
    }

    // 7. Update status in admissions table if linked
    if (admissionId) {
      await supabase
        .from("admissions")
        .update({ status: "approved", course_id: courseData.id })
        .eq("id", admissionId);
    } else if (phone) {
      await supabase
        .from("admissions")
        .update({ status: "approved", course_id: courseData.id })
        .eq("phone", phone.trim());
    }

    revalidatePath("/admissions");
    revalidatePath("/students");
    revalidatePath("/fees");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Admission completed for ${name}! Enrolled in ${courseData.title} (${batchTitle.trim()}).`,
      studentId: finalStudentIdCode,
    };
  } catch (err: any) {
    console.error("enrollPreAdmissionStudent error:", err);
    return { error: err.message || "Failed to complete admission." };
  }
}

export async function deletePreAdmissionUser(id: string, source: "student" | "admission") {
  try {
    const { supabase } = await requireAdmin();

    if (source === "student") {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("admissions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    }

    revalidatePath("/admissions");
    revalidatePath("/students");
    return { success: true };
  } catch (err: any) {
    console.error("deletePreAdmissionUser error:", err);
    return { error: err.message || "Failed to remove user." };
  }
}
