import { createServerSupabaseClient } from "@/lib/supabase-server";
import SearchAndFilter from "@/components/lms/admissions/SearchAndFilter";
import AdmissionRow from "@/components/lms/admissions/AdmissionRow";
import AdmissionMobileCard from "@/components/lms/admissions/AdmissionMobileCard";
import PreAdmissionTable from "@/components/lms/admissions/PreAdmissionTable";
import { PreAdmissionUser } from "@/components/lms/admissions/EnrollModal";
import { ClipboardList, Calendar, TrendingUp, Search, RotateCcw, UserCheck, Inbox } from "lucide-react";
import Link from "next/link";

export const unstable_instant = false;

export default async function AdminAdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const query = params.query || "";
  const activeTab = params.tab === "inquiries" ? "inquiries" : "registered";

  const supabase = await createServerSupabaseClient();

  // 1. Fetch Registered Pre-Admission Students from `students`
  const { data: rawPreStudents } = await supabase
    .from("students")
    .select(`
      id,
      student_id,
      name,
      phone,
      email,
      education,
      course,
      address,
      status,
      created_at
    `)
    .in("status", ["unadmitted", "pending"])
    .order("created_at", { ascending: false });

  // 2. Fetch Pending Leads / Inquiries from `admissions`
  const { data: rawPendingAdmissions } = await supabase
    .from("admissions")
    .select(`
      id,
      student_name,
      email,
      phone,
      qualification,
      address,
      message,
      status,
      created_at,
      courses(id, title, course_code),
      students(id, student_id)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Merge pre-admission records (students + admissions)
  const preAdmissionList: PreAdmissionUser[] = [];
  const phoneSeen = new Set<string>();

  (rawPreStudents || []).forEach((s) => {
    const cleanPhone = (s.phone || "").replace(/\D/g, "");
    if (cleanPhone) phoneSeen.add(cleanPhone);
    preAdmissionList.push({
      id: s.id,
      studentUuid: s.id,
      studentIdCode: s.student_id,
      name: s.name,
      phone: s.phone || "",
      email: s.email,
      education: s.education || "Student",
      interestedCourses: s.course || s.address || "General Inquiry",
      createdAt: s.created_at,
      source: "student",
    });
  });

  (rawPendingAdmissions || []).forEach((a) => {
    const cleanPhone = (a.phone || "").replace(/\D/g, "");
    if (cleanPhone && phoneSeen.has(cleanPhone)) {
      return;
    }
    const courseObj = Array.isArray(a.courses) ? a.courses[0] : a.courses;
    const studentObj = Array.isArray(a.students) ? a.students[0] : a.students;
    preAdmissionList.push({
      id: a.id,
      admissionId: a.id,
      studentUuid: studentObj?.id,
      studentIdCode: studentObj?.student_id || "Lead",
      name: a.student_name,
      phone: a.phone || "",
      email: a.email,
      education: a.qualification || "Student",
      interestedCourses: courseObj?.title || a.address || a.message || "General Inquiry",
      createdAt: a.created_at,
      source: "admission",
    });
  });

  // 3. Fetch courses and batches for enrollment modal
  const { data: coursesData } = await supabase
    .from("courses")
    .select("id, title, course_code, fee, discount_fee")
    .order("title");

  const { data: batchesData } = await supabase
    .from("batches")
    .select("id, title, timing")
    .order("title");

  // 4. Fetch all admissions for Stats & Inquiry Tab
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

  // Filtered inquiries list for Tab 2
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
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Admissions &amp; Leads
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
              {preAdmissionList.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage pre-admission registered users and review inquiries.
          </p>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <Link
          href="/admissions?tab=registered"
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "registered"
              ? "bg-blue-600 text-white shadow-2xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700"
          }`}
        >
          <UserCheck size={14} />
          <span>Registered Users (Pre-Admission)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === "registered"
                ? "bg-white/20 text-white"
                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            {preAdmissionList.length}
          </span>
        </Link>

        <Link
          href="/admissions?tab=inquiries"
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === "inquiries"
              ? "bg-blue-600 text-white shadow-2xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700"
          }`}
        >
          <Inbox size={14} />
          <span>Website Inquiries &amp; Forms</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === "inquiries"
                ? "bg-white/20 text-white"
                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
            }`}
          >
            {totalCount}
          </span>
        </Link>
      </div>

      {/* ── TAB 1: REGISTERED PRE-ADMISSION USERS ── */}
      {activeTab === "registered" && (
        <PreAdmissionTable
          users={preAdmissionList}
          courses={coursesData || []}
          batches={batchesData || []}
        />
      )}

      {/* ── TAB 2: WEBSITE INQUIRY RECORDS ── */}
      {activeTab === "inquiries" && (
        <div className="space-y-4">
          {/* Search Bar */}
          <SearchAndFilter currentStatus="" />

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight">Total</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                  <ClipboardList size={14} />
                </div>
              </div>
              <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none">{totalCount}</p>
              <p className="text-[9px] sm:text-[11px] text-blue-500 font-semibold mt-1">All time</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight">7 Days</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                  <TrendingUp size={14} />
                </div>
              </div>
              <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none">{thisWeekCount}</p>
              <p className="text-[9px] sm:text-[11px] text-emerald-500 font-semibold mt-1">This week</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-tight">Today</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center shrink-0">
                  <Calendar size={14} />
                </div>
              </div>
              <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none">{todayCount}</p>
              <p className="text-[9px] sm:text-[11px] text-violet-500 font-semibold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse inline-block" />
                Live
              </p>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
            <div className="px-4 py-3 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                  Inquiry Records
                </h2>
                <span className="text-xs text-slate-400 font-normal">
                  ({admissionsList.length} {admissionsList.length === 1 ? "record" : "records"})
                </span>
              </div>

              {query && (
                <Link
                  href="/admissions?tab=inquiries"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                >
                  <RotateCcw size={11} />
                  <span>Clear</span>
                </Link>
              )}
            </div>

            {/* Desktop Table */}
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
                              ? `No results matching "${query}".`
                              : "No admission inquiries have been submitted yet."}
                          </p>
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

            {/* Mobile Cards */}
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
      )}
    </div>
  );
}
