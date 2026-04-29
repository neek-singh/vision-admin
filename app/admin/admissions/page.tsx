import { createServerSupabaseClient } from "@/lib/supabase-server";
import AdminActions from "./AdminActions";

export const revalidate = 0;

export default async function AdminAdmissionsPage() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("admissions")
    .select(`
      id,
      student_name,
      email,
      phone,
      status,
      message,
      created_at,
      courses(title, course_code)
    `)
    .order("created_at", { ascending: false });

  const admissionsList = data || [];

  return (
    <div className="container mx-auto px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-950">Manage Admissions</h1>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Student Name</th>
                <th className="px-6 py-4 font-semibold">Contact Info</th>
                <th className="px-6 py-4 font-semibold">Course</th>
                <th className="px-6 py-4 font-semibold">Message</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admissionsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No admissions found.
                  </td>
                </tr>
              ) : (
                admissionsList.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{item.student_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{item.phone}</div>
                      <div className="text-xs text-gray-400">{item.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                        {item.courses?.title || "Unknown Course"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={item.message}>
                      {item.message || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === 'approved' 
                          ? 'bg-green-50 text-green-700' 
                          : item.status === 'rejected' 
                            ? 'bg-red-50 text-red-700' 
                            : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end items-center h-full">
                      <AdminActions 
                        id={item.id} 
                        status={item.status} 
                        phone={item.phone}
                        studentName={item.student_name}
                        courseTitle={item.courses?.title}
                      />
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