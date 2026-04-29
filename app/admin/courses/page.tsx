import Link from "next/link";
import { Button } from "@/components/ui/Button";
import DeleteButton from "@/components/admin/DeleteButton";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const revalidate = 0;

export default async function AdminCoursesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
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

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Course Title</th>
                <th className="px-6 py-4 font-semibold">Duration</th>
                <th className="px-6 py-4 font-semibold">Fee</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coursesList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No courses found. Add your first course to get started!
                  </td>
                </tr>
              ) : (
                coursesList.map((course) => (
                  <tr key={course.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{course.title}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                        {course.duration}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {course.discount_fee && course.discount_fee > 0 ? (
                        <div>
                          <span className="font-bold text-green-600">₹{course.discount_fee}</span>
                          <span className="ml-2 text-xs text-gray-400 line-through">₹{course.fee}</span>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">₹{course.fee}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-6 items-center">
                      <Link 
                        href={`/admin/courses/${course.id}/edit`} 
                        className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                      >
                        Edit
                      </Link>
                      <DeleteButton id={course.id} table="courses" title={course.title} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
