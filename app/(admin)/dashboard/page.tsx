import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import fs from "fs";
import { cacheLife } from "next/cache";
import {
  Users,
  BookOpen,
  GraduationCap,
  IndianRupee,
  Mail,
  TrendingUp,
  CheckCircle2,
  Activity,
  Zap,
  UserPlus,
  Calendar,
  PenLine,
  Wallet,
  HardDrive,
  Globe,
  ArrowUpRight,
  FileText,
  Image as ImageIcon,
  Clock,
  Layers,
} from "lucide-react";

// ── Cached local JSON reads ──────────────────────────────
async function getBlogsCached() {
  "use cache";
  cacheLife("minutes");
  try {
    const p = "c:\\Users\\as007\\vision-web\\features\\blog\\data\\blogs.json";
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}
  return [];
}

async function getGalleryCached() {
  "use cache";
  cacheLife("minutes");
  try {
    const p = "c:\\Users\\as007\\vision-web\\features\\gallery\\data\\gallery.json";
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}
  return [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN ADMIN PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/unauthorized");

  const now = new Date();
  const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
  const h = now.getHours();
  const greeting =
    h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold tracking-wide">
            {greeting}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Unified control center for Vision Learn LMS and Vision Web platform.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/30 shrink-0">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            System Operational
          </span>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent supabase={supabase} todayStr={todayStr} />
      </Suspense>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DASHBOARD CONTENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function DashboardContent({
  supabase,
  todayStr,
}: {
  supabase: any;
  todayStr: string;
}) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekAgoStr = oneWeekAgo.toISOString();

  // ── Parallel Data Fetch ──
  const [
    studentsRes,
    coursesRes,
    batchesRes,
    admissionsRes,
    pendingAdmissionsRes,
    todayAdmissionsRes,
    contactsRes,
    todayContactsRes,
    recentContactsRes,
    enrollmentsRes,
    recentActivityRes,
    feesRes,
    blogsRaw,
    galleryRaw,
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("batches").select("id", { count: "exact", head: true }),
    supabase.from("admissions").select("id", { count: "exact", head: true }),
    supabase
      .from("admissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("admissions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStr),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStr),
    supabase
      .from("contacts")
      .select("id, name, email, phone, message, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("enrollments").select("id, progress_percentage, created_at"),
    supabase
      .from("enrollments")
      .select(
        `
        id,
        progress_percentage,
        last_active_at,
        created_at,
        students(name, student_id),
        courses(title)
      `
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("fees")
      .select(
        "id, final_fee, increment_amount, payments(amount), students(status, is_deleted)"
      ),
    getBlogsCached(),
    getGalleryCached(),
  ]);

  // ── Stats Calculations ──
  const totalStudents = studentsRes.count || 0;
  const totalCourses = coursesRes.count || 0;
  const totalBatches = batchesRes.count || 0;
  const totalAdmissions = admissionsRes.count || 0;
  const pendingAdmissions = pendingAdmissionsRes.count || 0;
  const todayAdmissions = todayAdmissionsRes.count || 0;
  const totalContacts = contactsRes.count || 0;
  const todayContacts = todayContactsRes.count || 0;

  const enrollments: any[] = enrollmentsRes.data || [];
  const recentContacts: any[] = recentContactsRes.data || [];
  const recentActivity: any[] = recentActivityRes.data || [];

  // New students this week (based on enrollment or creation)
  const newThisWeek = enrollments.filter(
    (x) => x.created_at && x.created_at >= oneWeekAgoStr
  ).length;

  // Fee calculations
  const fees: any[] = feesRes.data || [];
  const totalCollection = fees.reduce((acc, f) => {
    return (
      acc +
      (f.payments?.reduce(
        (s: number, p: any) => s + Number(p.amount || 0),
        0
      ) || 0)
    );
  }, 0);
  const totalPending = fees
    .filter(
      (f) =>
        f.students &&
        f.students.status !== "dropped_out" &&
        !f.students.is_deleted
    )
    .reduce((acc, f) => {
      const paid =
        f.payments?.reduce(
          (s: number, p: any) => s + Number(p.amount || 0),
          0
        ) || 0;
      return (
        acc +
        (Number(f.final_fee || 0) + Number(f.increment_amount || 0) - paid)
      );
    }, 0);

  // Web Blogs & Gallery
  const blogs: any[] = blogsRaw || [];
  const publishedBlogs = blogs.filter((b) => b.is_published).length;
  const gallery: any[] = galleryRaw || [];

  // ── Top 5 KPI Stats ──
  const kpiStats = [
    {
      label: "Total Students",
      value: totalStudents,
      sub: newThisWeek > 0 ? `+${newThisWeek} new this week` : "Active enrolled",
      href: "/students",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
      border: "border-slate-200/80 dark:border-slate-800/80",
    },
    {
      label: "Active Courses",
      value: totalCourses,
      sub: `${totalBatches} active batches`,
      href: "/courses",
      icon: BookOpen,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40",
      border: "border-slate-200/80 dark:border-slate-800/80",
    },
    {
      label: "Admissions",
      value: totalAdmissions,
      sub:
        pendingAdmissions > 0
          ? `${pendingAdmissions} pending review`
          : `${todayAdmissions} new today`,
      href: "/admissions",
      icon: GraduationCap,
      color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40",
      border: "border-slate-200/80 dark:border-slate-800/80",
    },
    {
      label: "Fees Collected",
      value: `₹${(totalCollection / 1000).toFixed(1)}k`,
      sub: `₹${(totalPending / 1000).toFixed(1)}k pending`,
      href: "/fees",
      icon: IndianRupee,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-slate-200/80 dark:border-slate-800/80",
    },
    {
      label: "Website Enquiries",
      value: totalContacts,
      sub: todayContacts > 0 ? `${todayContacts} received today` : "General enquiries",
      href: "/contacts",
      icon: Mail,
      color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40",
      border: "border-slate-200/80 dark:border-slate-800/80",
    },
  ];

  // ── Quick Actions ──
  const quickActions = [
    {
      href: "/students/add",
      label: "Add Student",
      icon: UserPlus,
      cls: "text-blue-700 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 border-blue-200/50 dark:border-blue-900/40",
    },
    {
      href: "/batches/new",
      label: "Add Batch",
      icon: Calendar,
      cls: "text-violet-700 dark:text-violet-400 bg-violet-50/80 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/40 border-violet-200/50 dark:border-violet-900/40",
    },
    {
      href: "/courses/new",
      label: "Add Course",
      icon: BookOpen,
      cls: "text-indigo-700 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 border-indigo-200/50 dark:border-indigo-900/40",
    },
    {
      href: "/blogs/new",
      label: "Write Blog",
      icon: PenLine,
      cls: "text-amber-700 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 border-amber-200/50 dark:border-amber-900/40",
    },
    {
      href: "/lms/attendance",
      label: "Daily Attendance",
      icon: CheckCircle2,
      cls: "text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-900/40",
    },
    {
      href: "/fees",
      label: "Collect Fees",
      icon: Wallet,
      cls: "text-cyan-700 dark:text-cyan-400 bg-cyan-50/80 dark:bg-cyan-950/20 hover:bg-cyan-100 dark:hover:bg-cyan-950/40 border-cyan-200/50 dark:border-cyan-900/40",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. Top 5 KPI Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {kpiStats.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className={`group p-4 bg-white dark:bg-slate-900 rounded-2xl border ${kpi.border} shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                {kpi.label}
              </span>
              <div className={`p-2 rounded-xl ${kpi.color} shrink-0`}>
                <kpi.icon size={16} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                {kpi.value}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                  {kpi.sub}
                </span>
                <ArrowUpRight
                  size={13}
                  className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── 2. Quick Actions ── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
            <Zap size={14} className="text-amber-500" /> Quick Actions
          </h2>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Frequently used admin tasks
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] ${action.cls}`}
            >
              <div className="flex items-center gap-2 truncate">
                <action.icon size={15} className="shrink-0" />
                <span className="truncate">{action.label}</span>
              </div>
              <ArrowUpRight size={12} className="opacity-40 shrink-0 ml-1" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── 3. LMS Analytics Charts ── */}
      <LMSAnalytics enrollments={enrollments} />

      {/* ── 4. Recent Activity: LMS Progress & Web Enquiries ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Recent Student Progress (LMS) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Activity size={15} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-xs">
                    Recent Student Progress
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Latest learning activity in Vision Learn
                  </p>
                </div>
              </div>
              <Link
                href="/students"
                className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-[11px] flex items-center gap-0.5"
              >
                View All <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800/60">
                  <tr>
                    <th className="px-5 py-2.5 uppercase tracking-wider text-[10px]">
                      Student
                    </th>
                    <th className="px-5 py-2.5 uppercase tracking-wider text-[10px]">
                      Course
                    </th>
                    <th className="px-5 py-2.5 uppercase tracking-wider text-[10px]">
                      Progress
                    </th>
                    <th className="px-5 py-2.5 uppercase tracking-wider text-[10px] text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {!recentActivity?.length ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-slate-400 text-xs font-medium"
                      >
                        No recent student progress recorded.
                      </td>
                    </tr>
                  ) : (
                    recentActivity.map((item: any) => {
                      const sName =
                        (item.students as any)?.name || "Unknown Student";
                      const sId = (item.students as any)?.student_id;
                      const courseTitle =
                        (item.courses as any)?.title || "General Course";
                      const pct = item.progress_percentage || 0;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {sName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs">{sName}</p>
                                {sId && (
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono leading-none">
                                    {sId}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-500 dark:text-slate-400 font-medium truncate max-w-[150px]">
                            {courseTitle}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 sm:w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              href="/students"
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold text-xs"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-400 font-medium flex justify-between items-center">
            <span>Tracking active student completions</span>
            <Link
              href="/lms/progress"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Full Progress Matrix →
            </Link>
          </div>
        </div>

        {/* Recent Enquiries (Web) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Mail size={15} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-xs">
                    Recent Website Enquiries
                  </h2>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Prospective students reaching out via website
                  </p>
                </div>
              </div>
              <Link
                href="/contacts"
                className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-[11px] flex items-center gap-0.5"
              >
                View All <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="p-4 space-y-2.5">
              {!recentContacts?.length ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  No website enquiries received yet.
                </div>
              ) : (
                recentContacts.map((c: any, i: number) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5 shadow-2xs">
                      {c.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {c.name}
                        </p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                          {new Date(c.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {c.email || c.phone}
                      </p>
                      {c.message && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 italic">
                          &quot;{c.message}&quot;
                        </p>
                      )}
                    </div>
                    {i === 0 && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-md shrink-0 border border-rose-200/60 dark:border-rose-900/40">
                        New
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-400 font-medium flex justify-between items-center">
            <span>Direct leads & enquiry requests</span>
            <Link
              href="/contacts"
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Manage Inbox →
            </Link>
          </div>
        </div>
      </div>

      {/* ── 5. Infrastructure & Cloud Storage Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Infrastructure Health Services */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Globe size={14} className="text-slate-500" /> Infrastructure
              Health
            </h3>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-900/40">
              100% Up
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              { label: "Cloudflare Edge CDN", status: "Operational" },
              { label: "Supabase PostgreSQL DB", status: "Operational" },
              { label: "Supabase Object Storage", status: "Operational" },
              { label: "Cloudinary Media Delivery", status: "Operational" },
              { label: "Admin Management Console", status: "Operational" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between text-xs py-1"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {s.label}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cloud Storage Usage */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <HardDrive size={14} className="text-slate-500" /> Cloud Storage
              </h3>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 px-2 py-0.5 rounded-md">
                Healthy
              </span>
            </div>

            <div className="space-y-2.5 mt-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    1.82 GB
                  </span>
                  <span className="text-xs text-slate-400 font-medium ml-1">
                    / 5.0 GB Quota
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  36.4% Used
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-700 dark:bg-slate-300 rounded-full transition-all duration-500"
                  style={{ width: "36.4%" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                  <span>Media: 1.20 GB</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                  <span>Docs: 620 MB</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Available space: 3.18 GB</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Tier 1 Free Tier
            </span>
          </div>
        </div>

        {/* Website Content Overview */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers size={14} className="text-slate-500" /> Website Content
              </h3>
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                Live Status
              </span>
            </div>

            <div className="space-y-2.5 mt-2.5">
              <Link
                href="/blogs"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-800/50 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    <FileText size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Blog Articles
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {publishedBlogs} published • {blogs.length - publishedBlogs} drafts
                    </p>
                  </div>
                </div>
                <ArrowUpRight
                  size={13}
                  className="text-slate-400 group-hover:text-amber-500 transition-colors"
                />
              </Link>

              <Link
                href="/gallery"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-800/50 group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400">
                    <ImageIcon size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Gallery Albums
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {gallery.length} visual items stored
                    </p>
                  </div>
                </div>
                <ArrowUpRight
                  size={13}
                  className="text-slate-400 group-hover:text-pink-500 transition-colors"
                />
              </Link>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Website CMS Hub</span>
            <Link
              href="/blogs/new"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              + Create Post
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LMS ANALYTICS CHARTS (Bar Chart & Donut Chart)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LMSAnalytics({ enrollments }: { enrollments: any[] }) {
  // Monthly Course Enrolments (Last 6 Months)
  const months: { name: string; year: number; month: number; count: number }[] =
    [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      name: d.toLocaleDateString("en-US", { month: "short" }),
      year: d.getFullYear(),
      month: d.getMonth(),
      count: 0,
    });
  }

  enrollments.forEach((item) => {
    if (!item.created_at) return;
    const d = new Date(item.created_at);
    const m = d.getMonth();
    const y = d.getFullYear();
    const match = months.find((x) => x.month === m && x.year === y);
    if (match) {
      match.count++;
    }
  });

  const maxCount = Math.max(...months.map((m) => m.count), 1);

  // Completion Ranges
  const total = enrollments.length || 0;
  let range1 = 0; // 0-25%
  let range2 = 0; // 26-50%
  let range3 = 0; // 51-75%
  let range4 = 0; // 76-100%

  enrollments.forEach((item) => {
    const p = item.progress_percentage || 0;
    if (p <= 25) range1++;
    else if (p <= 50) range2++;
    else if (p <= 75) range3++;
    else range4++;
  });

  const pct1 = total ? Math.round((range1 / total) * 100) : 0;
  const pct2 = total ? Math.round((range2 / total) * 100) : 0;
  const pct3 = total ? Math.round((range3 / total) * 100) : 0;
  const pct4 = total ? Math.round((range4 / total) * 100) : 0;

  // Cumulative Dashoffsets for Donut Chart
  const dashoffset4 = 100;
  const dashoffset3 = 100 - pct4;
  const dashoffset2 = 100 - pct4 - pct3;
  const dashoffset1 = 100 - pct4 - pct3 - pct2;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
      {/* Monthly Course Enrolments (Bar Chart) */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                Monthly Course Enrolments
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                New student course registrations over the last 6 months
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
            Last 6 Months
          </span>
        </div>

        {/* SVG Bar Chart with subtle grid */}
        <div className="h-48 sm:h-52 w-full flex items-end justify-between gap-3 sm:gap-6 pt-6 pb-1 relative">
          <div className="absolute inset-x-0 top-6 bottom-7 flex flex-col justify-between pointer-events-none opacity-40">
            <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full" />
            <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full" />
            <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full" />
          </div>

          {months.map((m, idx) => {
            const heightPct =
              m.count > 0
                ? Math.max(Math.round((m.count / maxCount) * 100), 8)
                : 4;
            const hasData = m.count > 0;
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end z-10"
              >
                <div
                  className={`w-full max-w-[42px] rounded-t-lg relative group transition-all duration-300 cursor-pointer ${
                    hasData
                      ? "bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750"
                  }`}
                  style={{ height: `${heightPct}%` }}
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-md pointer-events-none">
                    {m.count} enrolled
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                  {m.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Ranges (Donut Chart) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3 flex flex-col justify-between">
        <div className="pb-2 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="font-bold text-slate-900 dark:text-white text-xs">
            Course Completion Progress
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">
            Overall progress distribution of enrolled students
          </p>
        </div>

        <div className="flex items-center justify-center h-36 relative">
          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="3"
              className="dark:stroke-slate-800"
            />

            {/* 76-100% Progress */}
            {pct4 > 0 && (
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeDasharray={`${pct4} ${100 - pct4}`}
                strokeDashoffset={dashoffset4}
                strokeLinecap="round"
              />
            )}
            {/* 51-75% Progress */}
            {pct3 > 0 && (
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray={`${pct3} ${100 - pct3}`}
                strokeDashoffset={dashoffset3}
                strokeLinecap="round"
              />
            )}
            {/* 26-50% Progress */}
            {pct2 > 0 && (
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeDasharray={`${pct2} ${100 - pct2}`}
                strokeDashoffset={dashoffset2}
                strokeLinecap="round"
              />
            )}
            {/* 0-25% Progress */}
            {pct1 > 0 && (
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                strokeDasharray={`${pct1} ${100 - pct1}`}
                strokeDashoffset={dashoffset1}
                strokeLinecap="round"
              />
            )}
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold text-slate-900 dark:text-white leading-none">
              {total}
            </span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Enrolled
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
            <span>76-100% ({pct4}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
            <span>51-75% ({pct3}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />
            <span>26-50% ({pct2}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-rose-500 rounded-full shrink-0" />
            <span>0-25% ({pct1}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DASHBOARD SKELETON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top 5 KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-2xl"
          />
        ))}
      </div>

      {/* Quick actions bar */}
      <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-64 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
        <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
        <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
      </div>

      {/* Infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="h-44 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
        <div className="h-44 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
        <div className="h-44 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
      </div>
    </div>
  );
}
