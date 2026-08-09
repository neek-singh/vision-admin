import { createServerSupabaseClient } from "@/lib/supabase-server";
import SearchAndFilter from "@/components/lms/admissions/SearchAndFilter";
import AdmissionRow from "@/components/lms/admissions/AdmissionRow";
import AdmissionMobileCard from "@/components/lms/admissions/AdmissionMobileCard";

export const revalidate = 0;

export default async function AdminAdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const params = await searchParams;
  const query = params.query || "";

  const supabase = await createServerSupabaseClient();

  // Fetch all for stats
  const { data: allData } = await supabase
    .from("admissions")
    .select("id, created_at");

  const allList = allData || [];
  const totalCount = allList.length;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayCount = allList.filter((a) => a.created_at?.startsWith(todayStr)).length;

  // Fetch filtered list
  let dbQuery = supabase
    .from("admissions")
    .select(`
      *,
      courses(title, course_code),
      students(student_id)
    `)
    .order("created_at", { ascending: false });

  if (query) {
    dbQuery = dbQuery.or(`student_name.ilike.%${query}%,phone.ilike.%${query}%`);
  }

  const { data } = await dbQuery;
  const admissionsList = data || [];

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Enquiry Admissions</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              All course inquiries from Vision IT &amp; University programs
            </p>
          </div>
          <SearchAndFilter currentStatus="" />
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div className="bg-white rounded-2xl border border-blue-100 p-4 flex items-center gap-3 shadow-sm">
            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
              <p className="text-2xl font-extrabold text-blue-600">{totalCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-violet-100 p-4 flex items-center gap-3 shadow-sm">
            <div className="bg-violet-50 text-violet-600 p-2.5 rounded-xl shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Today</p>
              <p className="text-2xl font-extrabold text-violet-600">{todayCount}</p>
            </div>
          </div>
        </div>

        {/* ── Showing count ── */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-slate-400">
            Showing <span className="text-slate-700 font-bold">{admissionsList.length}</span> inquiries
            {query && <span> for &quot;<span className="text-blue-600">{query}</span>&quot;</span>}
          </p>
          {query && (
            <a href="/admin/admissions" className="text-xs font-bold text-blue-600 hover:underline">
              Clear search
            </a>
          )}
        </div>

        {/* ── Table (Desktop) ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50 to-slate-50 text-blue-900 border-b border-slate-100">
                  <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-widest">#</th>
                  <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-widest">Student</th>
                  <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-widest">Father's Name</th>
                  <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-widest">Contact</th>
                  <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-widest">Course</th>
                  <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 font-bold text-[11px] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admissionsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-slate-400 font-semibold text-sm">No inquiries found</p>
                        {query && (
                          <a href="/admin/admissions" className="text-xs font-bold text-blue-600 hover:underline">Clear search</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  admissionsList.map((item: any, index: number) => (
                    <AdmissionRow key={item.id} item={item} index={index + 1} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden divide-y divide-slate-50">
            {admissionsList.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-slate-400 font-semibold text-sm">No inquiries found</p>
                </div>
              </div>
            ) : (
              admissionsList.map((item: any) => (
                <AdmissionMobileCard key={item.id} item={item} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
