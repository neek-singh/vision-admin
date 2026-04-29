import CourseForm from "../../CourseForm";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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
        <h1 className="text-3xl font-bold text-blue-950">Edit Course</h1>
        <p className="text-gray-500 mt-2 font-medium">Update the details for "{course.title}"</p>
      </div>
      <CourseForm course={course} />
    </div>
  );
}
