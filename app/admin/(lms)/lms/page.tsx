import { Suspense } from "react";
import { 
  BookOpen, 
  Users, 
  CheckCircle2,
  AlertCircle,
  Search,
  PlayCircle,
  FileText,
  ClipboardList,
  UserPlus,
  Calendar,
  Bell,
  Wallet,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  UserCheck,
  Activity,
  TrendingUp,
  Zap,
  Server
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Boneyard } from "@/components/ui/Boneyard";

export const unstable_instant = false;

// 📊 Stats Grid Component
function StatsGrid({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard 
        icon={Users} 
        label="Total Students" 
        value={stats.totalStudents} 
        colorClass="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40" 
        subText={stats.newThisWeek > 0 ? `+${stats.newThisWeek} new this week` : "No new students this week"} 
      />
      <StatCard 
        icon={BookOpen} 
        label="Active Courses" 
        value={stats.activeCourses} 
        colorClass="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/40" 
        subText="Across all departments" 
      />
      <StatCard 
        icon={CheckCircle2} 
        label="Avg. Completion" 
        value={`${stats.avgProgress}%`} 
        colorClass="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40" 
        progress={stats.avgProgress} 
      />
      <StatCard 
        icon={UserCheck} 
        label="Pending Admissions" 
        value={stats.pendingAdmissions} 
        colorClass="text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-100 dark:border-violet-900/40" 
        subText="Awaiting admin approval" 
      />
    </div>
  );
}

// 📈 LMS Analytics Charts Component
function LMSAnalytics({ enrollments }: { enrollments: any[] }) {
  // Calculate Monthly Course Enrolments (Last 6 Months)
  const months: { name: string; year: number; month: number; count: number }[] = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      name: d.toLocaleDateString("en-US", { month: "short" }),
      year: d.getFullYear(),
      month: d.getMonth(),
      count: 0
    });
  }

  enrollments.forEach(item => {
    if (!item.created_at) return;
    const d = new Date(item.created_at);
    const m = d.getMonth();
    const y = d.getFullYear();
    const match = months.find(x => x.month === m && x.year === y);
    if (match) {
      match.count++;
    }
  });

  const maxCount = Math.max(...months.map(m => m.count), 1);

  // Calculate Completion Ranges
  const total = enrollments.length || 0;
  let range1 = 0; // 0-25%
  let range2 = 0; // 26-50%
  let range3 = 0; // 51-75%
  let range4 = 0; // 76-100%

  enrollments.forEach(item => {
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
              <p className="text-[10px] text-slate-400 font-medium">New student course registrations</p>
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
            const heightPct = m.count > 0 
              ? Math.max(Math.round((m.count / maxCount) * 100), 8) 
              : 4;
            const hasData = m.count > 0;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end z-10">
                <div 
                  className={`w-full max-w-[42px] rounded-t-lg relative group transition-all duration-300 cursor-pointer ${
                    hasData 
                      ? 'bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 shadow-2xs' 
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750'
                  }`}
                  style={{ height: `${heightPct}%` }}
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-md pointer-events-none">
                    {m.count} enrolled
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{m.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Ranges (Donut Chart) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3 flex flex-col justify-between">
        <div className="pb-2 border-b border-slate-100 dark:border-slate-800/60">
          <h3 className="font-bold text-slate-900 dark:text-white text-xs">
            Course Completion
          </h3>
          <p className="text-[10px] text-slate-400 font-medium">Progress distribution of active students</p>
        </div>
        
        <div className="flex items-center justify-center h-36 relative">
          <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" className="dark:stroke-slate-800" />
            
            {/* 76-100% Progress */}
            {pct4 > 0 && (
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3" 
                strokeDasharray={`${pct4} ${100 - pct4}`} strokeDashoffset={dashoffset4} strokeLinecap="round" />
            )}
            {/* 51-75% Progress */}
            {pct3 > 0 && (
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3" 
                strokeDasharray={`${pct3} ${100 - pct3}`} strokeDashoffset={dashoffset3} strokeLinecap="round" />
            )}
            {/* 26-50% Progress */}
            {pct2 > 0 && (
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3" 
                strokeDasharray={`${pct2} ${100 - pct2}`} strokeDashoffset={dashoffset2} strokeLinecap="round" />
            )}
            {/* 0-25% Progress */}
            {pct1 > 0 && (
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3" 
                strokeDasharray={`${pct1} ${100 - pct1}`} strokeDashoffset={dashoffset1} strokeLinecap="round" />
            )}
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{total}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Students</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></span>
            <span>76-100% ({pct4}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></span>
            <span>51-75% ({pct3}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0"></span>
            <span>26-50% ({pct2}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-rose-500 rounded-full shrink-0"></span>
            <span>0-25% ({pct1}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🕒 Recent Student Progress Component
async function RecentActivity() {
  const supabase = await createServerSupabaseClient();
  const { data: activity } = await supabase
    .from("enrollments")
    .select(`
      id,
      progress_percentage,
      last_active_at,
      students(name),
      courses(title)
    `)
    .order("last_active_at", { ascending: false })
    .limit(5);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
        <h2 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
          <Activity size={15} className="text-blue-500" /> Recent Student Progress
        </h2>
        <Link href="/admin/students" className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-[11px] flex items-center gap-0.5">
          View All <ArrowUpRight size={12} />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800/60">
            <tr>
              <th className="px-5 py-2.5 uppercase tracking-wider text-[10px]">Student</th>
              <th className="px-5 py-2.5 uppercase tracking-wider text-[10px]">Course</th>
              <th className="px-5 py-2.5 uppercase tracking-wider text-[10px]">Progress</th>
              <th className="px-5 py-2.5 uppercase tracking-wider text-[10px] text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {!activity?.length ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs font-medium">No student progress recorded yet.</td></tr>
            ) : (
              activity.map((item: any) => {
                const sName = (item.students as any)?.name || "Unknown";
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {sName.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{sName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px]">
                      {(item.courses as any)?.title || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.progress_percentage || 0}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{item.progress_percentage || 0}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href="/admin/students" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold text-xs">
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
  );
}

// 🕒 Pending Admissions Component
async function PendingAdmissions() {
  const supabase = await createServerSupabaseClient();
  const { data: admissions } = await supabase
    .from("admissions")
    .select(`
      id,
      student_name,
      email,
      created_at,
      courses(title)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(4);

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/60">
        <h2 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
          <UserCheck size={15} className="text-violet-500" /> Pending Admissions
        </h2>
        <Link href="/admin/admissions" className="text-violet-600 dark:text-violet-400 hover:underline font-bold text-[11px] flex items-center gap-0.5">
          View All <ArrowUpRight size={12} />
        </Link>
      </div>

      {!admissions?.length ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 space-y-1.5">
          <ShieldCheck size={20} className="text-slate-300 dark:text-slate-600" />
          <p className="text-xs font-semibold text-slate-500">No pending admission applications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {admissions.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:border-slate-200 transition-all">
              <div className="min-w-0 pr-2">
                <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{item.student_name}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  Course: {(item.courses as any)?.title || "General"}
                </p>
              </div>
              <Link href="/admin/admissions" className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-xs shrink-0">
                Review
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 🚀 MAIN PAGE
export default async function LMSDashboard() {
  const supabase = await createServerSupabaseClient();

  const [studentsCount, coursesCount, enrollmentsRes, pendingAdmissions] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("progress_percentage, created_at"),
    supabase.from("admissions").select("*", { count: "exact", head: true }).eq("status", "pending")
  ]);

  const enrollments = enrollmentsRes.data || [];
  
  const avg = enrollments.length 
    ? Math.round(enrollments.reduce((acc, curr) => acc + (curr.progress_percentage || 0), 0) / enrollments.length)
    : 0;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newThisWeek = enrollments.filter(x => x.created_at && new Date(x.created_at) >= oneWeekAgo).length;

  const stats = {
    totalStudents: studentsCount.count || 0,
    activeCourses: coursesCount.count || 0,
    avgProgress: avg,
    pendingAdmissions: pendingAdmissions.count || 0,
    newThisWeek
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── Minimal Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-850">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              LMS Control Hub
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
              Live
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Monitor learning activity, approve admissions, and manage course content.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link 
            href="/admin/students/add" 
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
             <UserPlus size={14} /> Add Student Account
          </Link>
        </div>
      </div>

      {/* ── Compact Stat Cards ── */}
      <StatsGrid stats={stats} />

      {/* ── Analytics & Distribution ── */}
      <LMSAnalytics enrollments={enrollments} />

      {/* ── Mid Section: Recent Activity & LMS Controls ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Recent Student Activity with Suspense */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
              <Boneyard className="h-5 w-40" />
              <Boneyard className="h-10 w-full" count={4} />
            </div>
          }>
            <RecentActivity />
          </Suspense>
        </div>

        {/* Quick LMS Controls */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
               <Zap size={14} className="text-amber-500" /> LMS Utilities
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { href: "/admin/lms/content", label: "Course Curriculum", icon: PlayCircle, color: "text-blue-500" },
                { href: "/admin/lms/tests", label: "Academic Tests", icon: FileText, color: "text-rose-500" },
                { href: "/admin/lms/materials", label: "Notes & Materials", icon: BookOpen, color: "text-amber-500" },
                { href: "/admin/lms/projects", label: "Projects Manager", icon: ClipboardList, color: "text-indigo-500" },
                { href: "/admin/schedule", label: "Class Schedule", icon: Calendar, color: "text-sky-500" },
                { href: "/admin/lms/calendar", label: "Calendar & Events", icon: Calendar, color: "text-teal-500" },
              ].map(u => (
                <Link 
                  key={u.href} 
                  href={u.href} 
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-850/50 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <u.icon size={14} className={u.color} />
                    <span>{u.label}</span>
                  </div>
                  <ArrowUpRight size={12} className="text-slate-400 group-hover:text-blue-500 transition-colors opacity-60" />
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl text-white border border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                <Server size={13} className="text-emerald-400" /> LMS Core Server
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                Online (22ms)
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Database pool connections and object storage layers are running optimally.
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: Admissions & Quick Management ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Suspense fallback={<div className="bg-white rounded-2xl p-5 border border-slate-200/80"><Boneyard className="h-20 w-full" /></div>}>
          <PendingAdmissions />
        </Suspense>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs space-y-3">
          <h2 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
            <AlertCircle size={15} className="text-amber-500" /> Quick Management
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Link href="/admin/fees" className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-all border border-slate-100 dark:border-slate-800/40 flex justify-between items-center group">
              <div>
                <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Fees Manager</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Collect and view fees</p>
              </div>
              <Wallet size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
            </Link>
            <Link href="/admin/notifications" className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-all border border-slate-100 dark:border-slate-800/40 flex justify-between items-center group">
              <div>
                <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Push Notifications</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Send alerts to students</p>
              </div>
              <Bell size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🔹 Custom StatCard Helper
function StatCard({ icon: Icon, label, value, colorClass, subText, progress }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex justify-between items-start group">
      <div className="space-y-1 flex-1 pr-2 min-w-0">
        <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider leading-none truncate">{label}</p>
        <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">{value}</p>
        {subText && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">{subText}</p>}
        {progress !== undefined && (
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
             <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${colorClass} border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200`}>
        <Icon size={18} />
      </div>
    </div>
  );
}
