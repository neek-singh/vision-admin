import { createServerSupabaseClient } from "@/lib/supabase-server";
import AdminActions from "./AdminActions";
import SearchAndFilter from "./SearchAndFilter";

export const revalidate = 0;

export default async function AdminAdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; status?: string }>;
}) {
  const params = await searchParams;
  const query = params.query || "";
  const statusFilter = params.status || "";

  const supabase = await createServerSupabaseClient();

  let dbQuery = supabase
    .from("admissions")
    .select(`
      id,
      student_name,
      email,
      phone,
      status,
      created_at,
      father_name,
      qualification,
      courses(title, course_code),
      students(student_id)
    `)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    dbQuery = dbQuery.eq("status", statusFilter);
  }

  if (query) {
    dbQuery = dbQuery.or(`student_name.ilike.%${query}%,phone.ilike.%${query}%`);
  }

  const { data } = await dbQuery;
  const admissionsList = data || [];

  return (
    <div className="container mx-auto px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-blue-950">Enquiry Admissions</h1>
        <SearchAndFilter currentStatus={statusFilter} />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Student Name</th>
                <th className="px-6 py-4 font-semibold">Father's Name</th>
                <th className="px-6 py-4 font-semibold">Contact Info</th>
                <th className="px-6 py-4 font-semibold">Course</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admissionsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No admissions found.
                  </td>
                </tr>
              ) : (
                admissionsList.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{item.student_name}</div>
                      <div className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString('en-IN')}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.father_name || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{item.phone}</div>
                      <div className="text-xs text-gray-400">{item.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                        {(item.courses as any)?.title || "Unknown Course"}
                      </span>
                      <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">{(item.courses as any)?.course_code}</div>
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
                    <td className="px-6 py-4 text-right">
                      <AdminActions 
                        id={item.id} 
                        status={item.status} 
                        phone={item.phone}
                        studentName={item.student_name}
                        courseTitle={(item.courses as any)?.title}
                        studentId={item.students?.[0]?.student_id}
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