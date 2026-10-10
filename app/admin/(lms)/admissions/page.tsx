import { createServerSupabaseClient } from "@/lib/supabase-server";
import SearchAndFilter from "@/components/lms/admissions/SearchAndFilter";
import AdmissionRow from "@/components/lms/admissions/AdmissionRow";
import AdmissionMobileCard from "@/components/lms/admissions/AdmissionMobileCard";
import { ClipboardList, Calendar, TrendingUp, Search, RotateCcw } from "lucide-react";
import Link from "next/link";

export const unstable_instant = false;

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

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thisWeekCount = allList.filter(
    (a) => a.created_at && new Date(a.created_at) >= sevenDaysAgo
  ).length;

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
    dbQuery = dbQuery.or(`student_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
  }

  const { data } = await dbQuery;
  const admissionsList = data || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Enquiry Admissions
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            All course inquiries and admission applications from Vision IT &amp; University programs
          </p>
        </div>
        <SearchAndFilter currentStatus="" />
      </div>

      {/* ── Stats Cards (Clean & Minimal) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Total Inquiries */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-blue-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Inquiries
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
              <ClipboardList size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {totalCount}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              All time
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-normal">
            Cumulative applications received
          </p>
        </div>

        {/* This Week */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Past 7 Days
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {thisWeekCount}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Recent activity
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-normal">
            Inquiries received this past week
          </p>
        </div>

        {/* Today */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-violet-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20 group-hover:scale-105 transition-transform">
              <Calendar size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {todayCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-400">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              Logged today
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-normal">
            New inquiries recorded today
          </p>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden transition-colors">
        {/* Header bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
              Inquiry Records
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              ({admissionsList.length} {admissionsList.length === 1 ? "record" : "records"})
            </span>
          </div>

          {query && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">
                Filtered by &quot;{query}&quot;
              </span>
              <Link
                href="/admin/admissions"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
              >
                <RotateCcw size={11} />
                <span>Clear</span>
              </Link>
            </div>
          )}
        </div>

        {/* ── Desktop Table ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 text-xs font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5 w-12 text-center">#</th>
                <th className="px-5 py-3.5">Student</th>
                <th className="px-5 py-3.5">Father's Name</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Course</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {admissionsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                        <Search size={18} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        No inquiries found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {query
                          ? `No results matching "${query}". Try searching with a different name or phone number.`
                          : "No admission inquiries have been submitted yet."}
                      </p>
                      {query && (
                        <Link
                          href="/admin/admissions"
                          className="mt-3.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                        >
                          Clear search
                        </Link>
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
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {admissionsList.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No inquiries found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {query ? "Try a different search query." : "No inquiries yet."}
              </p>
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
