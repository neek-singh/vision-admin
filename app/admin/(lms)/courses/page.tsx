import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import CoursesTableClient from "@/components/lms/courses/CoursesTableClient";

export const revalidate = 0;

export default async function AdminCoursesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select(`
      *,
      enrollments:enrollments(count)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching courses for admin:", error);
  }

  const coursesList = courses || [];

  return (
    <div className="container mx-auto px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-950">Manage Courses</h1>
        <Button href="/admin/courses/new">Add New Course</Button>
      </div>

      <CoursesTableClient initialCourses={coursesList} />
    </div>
  );
}
