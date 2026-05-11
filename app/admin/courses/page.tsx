import Link from "next/link";
import { Button } from "@/components/ui/Button";
import DeleteButton from "@/components/admin/DeleteButton";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Course Title</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-center">Students</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Fee</th>
                <th className="px-6 py-4 font-semibold text-right text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coursesList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
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
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black border border-emerald-100">
                          {course.enrollments?.[0]?.count || 0} enrolled
                        </span>
                      </div>
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

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {coursesList.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 font-medium">
              No courses found.
            </div>
          ) : (
            coursesList.map((course) => (
              <div key={course.id} className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-slate-900 text-lg leading-tight">{course.title}</h4>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {course.duration}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                   <div className="flex flex-col">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fee Structure</p>
                    {course.discount_fee && course.discount_fee > 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-emerald-600 text-lg">₹{course.discount_fee}</span>
                        <span className="text-xs text-slate-400 line-through">₹{course.fee}</span>
                      </div>
                    ) : (
                      <span className="font-black text-slate-900 text-lg">₹{course.fee}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Students</p>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-black border border-emerald-100">
                      {course.enrollments?.[0]?.count || 0} ACTIVE
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-50">
                  <Link 
                    href={`/admin/courses/${course.id}/edit`} 
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest text-center"
                  >
                    Edit Course
                  </Link>
                  <div className="flex-1">
                    <DeleteButton id={course.id} table="courses" title={course.title} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
