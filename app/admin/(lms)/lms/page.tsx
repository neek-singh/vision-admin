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
  TrendingUp
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import { Boneyard } from "@/components/ui/Boneyard";

export const revalidate = 0;

// 📊 Stats Grid Component
async function StatsGrid() {
  const supabase = await createServerSupabaseClient();
  
  const [studentsCount, coursesCount, enrollmentsData, pendingAdmissions] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("enrollments").select("progress_percentage"),
    supabase.from("admissions").select("*", { count: "exact", head: true }).eq("status", "pending")
  ]);

  const avg = enrollmentsData.data?.length 
    ? Math.round(enrollmentsData.data.reduce((acc, curr) => acc + (curr.progress_percentage || 0), 0) / enrollmentsData.data.length)
    : 0;

  const stats = {
    totalStudents: studentsCount.count || 0,
    activeCourses: coursesCount.count || 0,
    avgProgress: avg,
    pendingAdmissions: pendingAdmissions.count || 0 
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <StatCard 
        icon={Users} 
        label="Total Students" 
        value={stats.totalStudents} 
        color="bg-blue-500" 
        subText="+4 new this week" 
      />
      <StatCard 
        icon={BookOpen} 
        label="Active Courses" 
        value={stats.activeCourses} 
        color="bg-indigo-500" 
        subText="Across all departments" 
      />
      <StatCard 
        icon={CheckCircle2} 
        label="Avg. Completion" 
        value={`${stats.avgProgress}%`} 
        color="bg-emerald-500" 
        progress={stats.avgProgress} 
      />
      <StatCard 
        icon={UserCheck} 
        label="Pending Admissions" 
        value={stats.pendingAdmissions} 
        color="bg-violet-500" 
        subText="Awaiting admin approval" 
      />
    </div>
  );
}

// 📈 LMS Analytics Charts Component
function LMSAnalytics() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Monthly Course Enrolments (Bar Chart) */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" /> Monthly Course Enrolments
          </h3>
          <span className="text-[10px] bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
            Last 6 Months
          </span>
        </div>
        
        {/* SVG Bar Chart */}
        <div className="h-60 w-full flex items-end justify-between gap-1.5 sm:gap-3 pt-6 border-b border-slate-100 dark:border-slate-800/60 pb-1">
          <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[45%] relative group hover:bg-blue-600/20 transition-all cursor-pointer">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">12 std</div>
              <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[85%]"></div>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Jan</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[65%] relative group hover:bg-blue-600/20 transition-all cursor-pointer">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">18 std</div>
              <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[90%]"></div>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Feb</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[55%] relative group hover:bg-blue-600/20 transition-all cursor-pointer">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">15 std</div>
              <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[80%]"></div>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Mar</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[85%] relative group hover:bg-blue-600/20 transition-all cursor-pointer">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">24 std</div>
              <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[95%]"></div>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Apr</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[70%] relative group hover:bg-blue-600/20 transition-all cursor-pointer">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">20 std</div>
              <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[88%]"></div>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">May</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[95%] relative group hover:bg-blue-600/20 transition-all cursor-pointer">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">26 std</div>
              <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[98%]"></div>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Jun</span>
          </div>
        </div>
      </div>

      {/* Progress Ranges (Donut Chart) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4 flex flex-col justify-between">
        <div>
          <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm">
            Course Completion
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Progress distribution</p>
        </div>
        
        <div className="flex items-center justify-center h-40 relative">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.2" className="dark:stroke-slate-800/40" />
            
            {/* 76-100% Progress - 50% */}
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(16, 185, 129)" strokeWidth="3.2" 
              strokeDasharray="50 50" strokeDashoffset="100" />
            {/* 51-75% Progress - 25% */}
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(59, 130, 246)" strokeWidth="3.2" 
              strokeDasharray="25 75" strokeDashoffset="50" />
            {/* 26-50% Progress - 15% */}
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(245, 158, 11)" strokeWidth="3.2" 
              strokeDasharray="15 85" strokeDashoffset="25" />
            {/* 0-25% Progress - 10% */}
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="3.2" 
              strokeDasharray="10 90" strokeDashoffset="10" />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-blue-950 dark:text-white">8</span>
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Students</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0"></span>
            <span>76-100% (50%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0"></span>
            <span>51-75% (25%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0"></span>
            <span>26-50% (15%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0"></span>
            <span>0-25% (10%)</span>
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
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
        <h2 className="font-black text-slate-800 dark:text-slate-200 text-base flex items-center gap-2">
          <Activity size={18} className="text-blue-500" /> Recent Student Progress
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold">
            <tr>
              <th className="px-6 py-3.5 text-xs uppercase tracking-wider">Student</th>
              <th className="px-6 py-3.5 text-xs uppercase tracking-wider">Course</th>
              <th className="px-6 py-3.5 text-xs uppercase tracking-wider">Progress</th>
              <th className="px-6 py-3.5 text-xs uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {!activity?.length ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400">No student progress recorded yet.</td></tr>
            ) : (
              activity.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{(item.students as any)?.name}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{(item.courses as any)?.title}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${item.progress_percentage}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{item.progress_percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href="/admin/students" className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-xs uppercase tracking-widest">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))
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
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-black text-slate-800 dark:text-slate-200 text-base flex items-center gap-2">
          <UserCheck size={18} className="text-violet-500" /> Pending Admissions
        </h2>
        <Link href="/admin/admissions" className="text-violet-600 dark:text-violet-400 hover:underline font-black text-xs uppercase tracking-widest flex items-center gap-0.5">
          View All <ArrowUpRight size={14} />
        </Link>
      </div>

      {!admissions?.length ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500 space-y-2">
          <ShieldCheck size={24} className="stroke-1 text-slate-300 dark:text-slate-600" />
          <p className="text-xs font-bold">No pending admission applications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {admissions.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/30">
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.student_name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-snug">
                  Course: {(item.courses as any)?.title || "Unknown"}
                </p>
              </div>
              <Link href="/admin/admissions" className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm">
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
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-blue-950 dark:text-white tracking-tight">LMS Control Hub 🎓</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor learning activity, approve admissions, and manage course content.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/students/add" className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-blue-600/10 flex items-center gap-2">
             <UserPlus size={16} /> Add Student Account
          </Link>
        </div>
      </div>

      {/* Stats Grid with Suspense */}
      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-4 gap-6"><Boneyard className="h-28 rounded-3xl" count={4} /></div>}>
        <StatsGrid />
      </Suspense>

      {/* LMS Analytics Section (Charts) */}
      <LMSAnalytics />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Student Activity with Suspense */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <Boneyard className="h-6 w-48" />
              <Boneyard className="h-12 w-full" count={5} />
            </div>
          }>
            <RecentActivity />
          </Suspense>
        </div>

        {/* Quick LMS Controls */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/85 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
               LMS Utilities
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/admin/lms/content" className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100/70 dark:hover:bg-blue-950/40 transition-all font-bold text-xs hover:scale-[1.01]">
                <PlayCircle size={16} /> Course Curriculum
              </Link>
              <Link href="/admin/lms/tests" className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 transition-all font-bold text-xs hover:scale-[1.01]">
                <FileText size={16} /> Manage Academic Tests
              </Link>
              <Link href="/admin/lms/materials" className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 transition-all font-bold text-xs hover:scale-[1.01]">
                <BookOpen size={16} /> Notes & Materials
              </Link>
              <Link href="/admin/lms/assignments" className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/40 transition-all font-bold text-xs hover:scale-[1.01]">
                <ClipboardList size={16} /> Assignments Manager
              </Link>
              <Link href="/admin/schedule" className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 hover:bg-sky-100/70 dark:hover:bg-sky-950/40 transition-all font-bold text-xs hover:scale-[1.01]">
                <Calendar size={16} /> Manage Class Schedule
              </Link>
              <Link href="/admin/lms/calendar" className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 hover:bg-teal-100/70 dark:hover:bg-teal-950/40 transition-all font-bold text-xs hover:scale-[1.01]">
                <Calendar size={16} /> Calendar & Events
              </Link>
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-[#060a13] p-6 rounded-3xl text-white relative overflow-hidden border border-slate-800 shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full -mr-12 -mt-12 blur-xl" />
            <h3 className="font-bold text-sm mb-2 relative z-10 flex items-center gap-2">
               LMS Core Server
            </h3>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold mb-4 relative z-10">
              <div className="w-2 h-2 bg-emerald-450 rounded-full animate-ping" />
              LMS Node Online (Latency 22ms)
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed relative z-10">
              Database pool connections and object storage layers are running at full speed.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Admissions & Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div className="bg-white rounded-3xl p-6 border border-slate-200"><Boneyard className="h-24 w-full" /></div>}>
          <PendingAdmissions />
        </Suspense>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <h2 className="font-black text-slate-800 dark:text-slate-200 text-base flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" /> LMS System Settings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/admin/fees" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all border border-slate-100/50 dark:border-slate-800/40 flex justify-between items-center group">
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Fees Manager</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Collect and view fees</p>
              </div>
              <Wallet size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
            </Link>
            <Link href="/admin/notifications" className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all border border-slate-100/50 dark:border-slate-800/40 flex justify-between items-center group">
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Push Notifications</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Send alerts to students</p>
              </div>
              <Bell size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🔹 Custom StatCard Helper
function StatCard({ icon: Icon, label, value, color, subText, progress }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex justify-between items-start group hover:shadow-md dark:hover:shadow-slate-900/50 transition-all duration-200">
      <div className="space-y-1.5 flex-1 pr-2 min-w-0">
        <p className="text-gray-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none truncate">{label}</p>
        <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white leading-none pt-0.5">{value}</p>
        {subText && <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-extrabold truncate">{subText}</p>}
        {progress !== undefined && (
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
             <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <div className={`p-2 sm:p-2.5 rounded-xl ${color} text-white bg-opacity-95 shadow-sm shrink-0`}>
        <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
      </div>
    </div>
  );
}
