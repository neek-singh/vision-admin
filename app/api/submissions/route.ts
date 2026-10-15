import { NextResponse } from "next/server";
import { notifyAssignmentSubmission } from "@/app/actions/lms/submissions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await notifyAssignmentSubmission({
      studentName: body.student_name || body.studentName,
      assignmentTitle: body.assignment_title || body.assignmentTitle,
      studentId: body.student_id || body.studentId,
      assignmentId: body.assignment_id || body.assignmentId,
      lessonId: body.lesson_id || body.lessonId,
    });
    return NextResponse.json({ ...result });
  } catch (err: unknown) {
    console.error("[api/submissions] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Error" },
      { status: 500 }
    );
  }
}
