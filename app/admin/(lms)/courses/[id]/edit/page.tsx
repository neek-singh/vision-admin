import CourseForm from "@/components/lms/courses/CourseForm";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const unstable_instant = false;

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !course) {
    console.error("Error fetching course for edit:", error);
    return notFound();
  }

  return (
    <div className="container mx-auto px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Edit Course</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm font-normal">Update the details for "{course.title}"</p>
      </div>
      <CourseForm course={course} />
    </div>
  );
}
