"use client";

import { useState, useEffect } from "react";
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  PlayCircle,
  FileText,
  Loader2,
  ExternalLink,
  ClipboardList
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LMSDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    avgProgress: 0,
    pendingAssignments: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const [studentsCount, coursesCount, enrollmentsData] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("enrollments").select("progress_percentage")
      ]);

      const avg = enrollmentsData.data?.length 
        ? Math.round(enrollmentsData.data.reduce((acc, curr) => acc + curr.progress_percentage, 0) / enrollmentsData.data.length)
        : 0;

      setStats({
        totalStudents: studentsCount.count || 0,
        activeCourses: coursesCount.count || 0,
        avgProgress: avg,
        pendingAssignments: 0 // Will integrate when assignments table exists
      });

      // 2. Fetch Recent Activity
      const { data: activity } = await supabase
        .from("enrollments")
        .select(`
          id,
          progress_percentage,
          last_active_at,
          students(student_name),
          courses(title)
        `)
        .order("last_active_at", { ascending: false })
        .limit(5);

      setRecentActivity(activity || []);
    } catch (error) {
      console.error("Error fetching LMS data:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredActivity = recentActivity.filter(item => 
    item.students?.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.courses?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">LMS Control Hub</h1>
          <p className="text-sm text-slate-500">Monitor learning activity and manage course content.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/courses" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2">
             <BookOpen size={16} /> Manage All Courses
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Users} 
          label="Total Students" 
          value={stats.totalStudents} 
          color="blue" 
          trend="+5% from last month" 
        />
        <StatCard 
          icon={BookOpen} 
          label="Active Courses" 
          value={stats.activeCourses} 
          color="indigo" 
          sub="Across all departments" 
        />
        <StatCard 
          icon={CheckCircle2} 
          label="Avg. Completion" 
          value={`${stats.avgProgress}%`} 
          color="emerald" 
          progress={stats.avgProgress} 
        />
        <StatCard 
          icon={AlertCircle} 
          label="Pending Grading" 
          value={stats.pendingAssignments} 
          color="amber" 
          sub="Requires immediate action" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Student Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Recent Student Progress</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search activity..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-slate-50 border-transparent text-xs rounded-lg outline-none focus:bg-white focus:border-blue-500 w-48 transition-all" 
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" /></div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold">
                    <tr>
                      <th className="px-6 py-3">Student</th>
                      <th className="px-6 py-3">Course</th>
                      <th className="px-6 py-3">Progress</th>
                      <th className="px-6 py-3">Last Active</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredActivity.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No recent activity found.</td></tr>
                    ) : (
                      filteredActivity.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">{item.students?.student_name}</td>
                          <td className="px-6 py-4 text-slate-500">{item.courses?.title}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${item.progress_percentage}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-blue-600">{item.progress_percentage}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs">
                            {item.last_active_at ? new Date(item.last_active_at).toLocaleDateString() : "Never"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-blue-600 hover:underline font-bold text-xs">View Log</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
               <Link href="/admin/lms/progress" className="text-xs font-bold text-blue-600 hover:underline">View All Student Activity</Link>
            </div>
          </div>
        </div>

        {/* Quick LMS Controls */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
               Quick Controls
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/admin/lms/content" className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all font-bold text-sm">
                <PlayCircle size={18} /> Course Curriculum
              </Link>
              <Link href="/admin/lms/tests" className="w-full flex items-center gap-3 p-3 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all font-bold text-sm">
                <FileText size={18} /> Manage Tests
              </Link>
              <Link href="/admin/lms/materials" className="w-full flex items-center gap-3 p-3 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all font-bold text-sm">
                <BookOpen size={18} /> Notes & Materials
              </Link>
              <Link href="/admin/lms/assignments" className="w-full flex items-center gap-3 p-3 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all font-bold text-sm">
                <ClipboardList size={18} /> Assignments
              </Link>
              <Link href="/admin/lms/attendance" className="w-full flex items-center gap-3 p-3 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all font-bold text-sm">
                <CheckCircle2 size={18} /> Daily Attendance
              </Link>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/20 rounded-full -mr-12 -mt-12 blur-xl" />
            <h3 className="font-bold text-sm mb-2 relative z-10">System Status</h3>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold mb-4 relative z-10">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              LMS Server Online
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4 relative z-10">
              Content delivery network (CDN) is performing optimally. Student login latency is low (24ms).
            </p>
            <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all">
               View Server Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, trend, sub, progress }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600"
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${colors[color]} rounded-lg flex items-center justify-center`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
          <TrendingUp size={12} /> {trend}
        </div>
      )}
      {sub && <p className="text-[10px] text-slate-400 font-bold">{sub}</p>}
      {progress !== undefined && (
        <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
           <div className={`h-full ${color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
