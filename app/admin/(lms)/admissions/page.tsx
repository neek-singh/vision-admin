import { createServerSupabaseClient } from "@/lib/supabase-server";
import SearchAndFilter from "@/components/lms/admissions/SearchAndFilter";
import AdmissionRow from "@/components/lms/admissions/AdmissionRow";
import AdmissionMobileCard from "@/components/lms/admissions/AdmissionMobileCard";

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
      *,
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
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Father's Name</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-right text-xs uppercase tracking-wider">Actions</th>
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
                  <AdmissionRow key={item.id} item={item} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {admissionsList.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 font-medium">
              No admissions found.
            </div>
          ) : (
            admissionsList.map((item: any) => (
              <AdmissionMobileCard key={item.id} item={item} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
