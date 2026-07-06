"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  History,
  BarChart3,
  Search,
  Loader2,
  QrCode,
  Camera,
  X,
  Copy,
  Check,
  Download,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Play,
  Square,
  ChevronDown,
  Wifi,
  WifiOff,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { initializeDailyAttendance } from "@/app/actions/lms/attendance";
import WebcamScanner from "./WebcamScanner";

type AttendanceStatus = "present" | "absent" | "late";

interface Student {
  id: string;
  name: string;
  student_id: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  course_id: string;
  date: string;
  status: AttendanceStatus;
  check_in_time?: string;
  students?: { name: string; student_id: string };
  courses?: { title: string };
}

interface AttendanceSession {
  id: string;
  session_token: string;
  course_id: string;
  date: string;
  expires_at: string;
  status: string;
}

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
];



function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function AttendanceClient({
  initialCourses,
  initialBatches,
}: {
  initialCourses: any[];
  initialBatches: any[];
}) {
  const [activeTab, setActiveTab] = useState<"mark" | "history" | "report" | "qr">("mark");
  const [selectedCourse, setSelectedCourse] = useState(initialCourses[0]?.id || "");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearing, setClearing] = useState(false);

  // History tab
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split("T")[0]);
  const [historyCourse, setHistoryCourse] = useState(initialCourses[0]?.id || "");

  // Report tab
  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [reportCourse, setReportCourse] = useState(initialCourses[0]?.id || "");
  const [reportData, setReportData] = useState<
    { student: Student; present: number; absent: number; late: number; total: number }[]
  >([]);
  const [reportLoading, setReportLoading] = useState(false);



  useEffect(() => {
    // Automatically initialize daily attendance for today on load
    initializeDailyAttendance()
      .then((res) => {
        if (res && !res.error && res.count && res.count > 0) {
          fetchStudentsAndAttendance();
        }
      })
      .catch((err) => {
        console.error("Failed to auto-initialize daily attendance:", err);
      });
  }, []);

  useEffect(() => {
    if (selectedCourse && activeTab === "mark") {
      fetchStudentsAndAttendance();
    }
  }, [selectedCourse, selectedBatch, selectedDate, activeTab]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, historyDate, historyCourse]);

  useEffect(() => {
    if (activeTab === "report") {
      fetchReport();
    }
  }, [activeTab, reportMonth, reportCourse]);

  async function fetchStudentsAndAttendance() {
    setLoading(true);
    try {
      let studentQuery = supabase
        .from("enrollments")
        .select(`student_id, students(id, name, student_id)`)
        .eq("course_id", selectedCourse);

      if (selectedBatch) studentQuery = studentQuery.eq("batch", selectedBatch);

      const { data: enrollments, error: enrollError } = await studentQuery;
      if (enrollError) throw enrollError;

      const studentList = enrollments?.map((e: any) => e.students).filter(Boolean) || [];
      setStudents(studentList);

      const { data: existingRecords, error: attendError } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("course_id", selectedCourse)
        .eq("date", selectedDate);

      if (attendError) throw attendError;

      const initialAttend: Record<string, AttendanceStatus> = {};
      studentList.forEach((s: any) => {
        const record = existingRecords?.find((r) => r.student_id === s.id);
        initialAttend[s.id] = record ? record.status : "absent";
      });
      setAttendance(initialAttend);
    } catch (err: any) {
      console.error("Attendance Fetch Error:", err.message || err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistory() {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`id, student_id, course_id, date, status, check_in_time, students(name, student_id)`)
        .eq("course_id", historyCourse)
        .eq("date", historyDate)
        .order("students(name)");

      if (error) throw error;
      
      const formattedRecords: AttendanceRecord[] = (data || []).map((record: any) => ({
        id: record.id,
        student_id: record.student_id,
        course_id: record.course_id,
        date: record.date,
        status: record.status,
        check_in_time: record.check_in_time,
        students: Array.isArray(record.students)
          ? record.students[0]
          : record.students,
      }));
      
      setHistoryRecords(formattedRecords);
    } catch (err: any) {
      console.error("History Fetch Error:", err);
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function fetchReport() {
    setReportLoading(true);
    try {
      const [year, month] = reportMonth.split("-");
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(Number(year), Number(month), 0).toISOString().split("T")[0];

      // Fetch all attendance for the month
      const { data: records, error } = await supabase
        .from("attendance")
        .select(`student_id, status, students(id, name, student_id)`)
        .eq("course_id", reportCourse)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;

      // Aggregate per student
      const studentMap: Record<
        string,
        { student: Student; present: number; absent: number; late: number; total: number }
      > = {};

      records?.forEach((r: any) => {
        if (!r.students) return;
        const sid = r.student_id;
        if (!studentMap[sid]) {
          studentMap[sid] = {
            student: r.students,
            present: 0,
            absent: 0,
            late: 0,
            total: 0,
          };
        }
        studentMap[sid].total++;
        if (r.status === "present") studentMap[sid].present++;
        else if (r.status === "absent") studentMap[sid].absent++;
        else if (r.status === "late") studentMap[sid].late++;
      });

      const sorted = Object.values(studentMap).sort((a, b) => {
        const pctA = a.total ? (a.present / a.total) * 100 : 0;
        const pctB = b.total ? (b.present / b.total) * 100 : 0;
        return pctB - pctA;
      });

      setReportData(sorted);
    } catch (err: any) {
      console.error("Report Fetch Error:", err);
    } finally {
      setReportLoading(false);
    }
  }

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAllAs = (status: AttendanceStatus) => {
    const newAttend: Record<string, AttendanceStatus> = {};
    students.forEach((s) => (newAttend[s.id] = status));
    setAttendance(newAttend);
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        course_id: selectedCourse,
        date: selectedDate,
        status: status,
        marked_by: user?.id,
      }));

      await supabase.from("attendance").delete().eq("course_id", selectedCourse).eq("date", selectedDate);
      const { error } = await supabase.from("attendance").insert(records);
      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Attendance Save Error:", err.message || err);
      alert(`Failed to save: ${err.message || "Check connection"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncTemplate = async () => {
    setInitializing(true);
    try {
      const res = await initializeDailyAttendance(selectedDate);
      if (res.error) {
        alert(`Failed to sync template: ${res.error}`);
      } else {
        await fetchStudentsAndAttendance();
        alert(`Success! Enrolled students initialized for ${selectedDate}.`);
      }
    } catch (err: any) {
      alert(`Error syncing template: ${err.message || err}`);
    } finally {
      setInitializing(false);
    }
  };

  const clearAttendance = async () => {
    if (!confirm("Are you sure you want to delete ALL attendance records for this course and date? This action cannot be undone.")) return;
    setClearing(true);
    try {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("course_id", selectedCourse)
        .eq("date", selectedDate);
      
      if (error) throw error;
      
      const resetAttend: Record<string, AttendanceStatus> = {};
      students.forEach((s) => {
        resetAttend[s.id] = "absent";
      });
      setAttendance(resetAttend);
      alert("All attendance records for this date and course have been cleared.");
    } catch (err: any) {
      console.error("Clear Attendance Error:", err.message || err);
      alert(`Failed to clear: ${err.message || "Check connection"}`);
    } finally {
      setClearing(false);
    }
  };

  const deleteHistoryRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attendance record?")) return;
    try {
      const { error } = await supabase.from("attendance").delete().eq("id", id);
      if (error) throw error;
      setHistoryRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      console.error("Delete Attendance Record Error:", err.message || err);
      alert(`Failed to delete record: ${err.message || "Check connection"}`);
    }
  };



  function exportCSV() {
    const headers = ["Student Name", "Student ID", "Present", "Absent", "Late", "Total Days", "Attendance %"];
    const rows = reportData.map((r) => {
      const pct = r.total ? ((r.present / r.total) * 100).toFixed(1) : "0.0";
      return [r.student.name, r.student.student_id, r.present, r.absent, r.late, r.total, pct];
    });

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${reportMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    present: Object.values(attendance).filter((s) => s === "present").length,
    absent: Object.values(attendance).filter((s) => s === "absent").length,
    late: Object.values(attendance).filter((s) => s === "late").length,
  };

  const tabs = [
    { id: "mark", label: "Mark Attendance", icon: CheckCircle2 },
    { id: "history", label: "History", icon: History },
    { id: "report", label: "Monthly Report", icon: BarChart3 },
    { id: "qr", label: "Webcam Scanner", icon: Camera },
  ];

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-fit flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === id
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ───────────────── MARK ATTENDANCE TAB ───────────────── */}
      {activeTab === "mark" && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Course</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => {
                      setSelectedCourse(e.target.value);
                      setSelectedBatch("");
                    }}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
                  >
                    {initialCourses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch</label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
                  >
                    <option value="">All Batches</option>
                    {initialBatches
                      .filter((b) => b.course_id === selectedCourse)
                      .map((b) => (
                        <option key={b.id} value={b.title}>{b.title}</option>
                      ))}
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => markAllAs("present")}
                  className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
                >
                  ✓ Mark All Present
                </button>
                <button
                  onClick={() => markAllAs("absent")}
                  className="flex-1 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
                >
                  ✗ Mark All Absent
                </button>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={handleSyncTemplate}
                  disabled={initializing}
                  className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 disabled:opacity-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {initializing ? (
                    <Loader2 className="animate-spin" size={13} />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  {initializing ? "Initializing..." : "Sync Enrolled Students (Auto-Mark Absent)"}
                </button>
                <p className="text-[9px] text-slate-400 font-medium text-center mt-2 leading-relaxed">
                  ℹ️ Daily attendance is initialized automatically. Use this to manually sync students enrolled today.
                </p>
              </div>
            </div>

            {/* Total Students */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center group">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                <Users size={22} />
              </div>
              <p className="text-3xl font-black text-slate-900">{students.length}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Students</p>
            </div>

            {/* Stats */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              {[
                { label: "Present", count: stats.present, color: "emerald" },
                { label: "Absent", count: stats.absent, color: "rose" },
                { label: "Late", count: stats.late, color: "amber" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                  </div>
                  <span className={`text-sm font-black text-${color}-600`}>{count}</span>
                </div>
              ))}
              {students.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(stats.present / students.length) * 100}%` }} />
                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${(stats.late / students.length) * 100}%` }} />
                    <div className="bg-rose-500 h-full transition-all" style={{ width: `${(stats.absent / students.length) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student by name or ID..."
              className="w-full bg-white border border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20 shadow-sm transition-all"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                    <th className="px-8 py-5">Student</th>
                    <th className="px-8 py-5">Student ID</th>
                    <th className="px-8 py-5 text-center">Mark Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center">
                        <Loader2 className="animate-spin text-indigo-600 mx-auto mb-3" size={28} />
                        <p className="text-sm font-bold text-slate-400">Loading students...</p>
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold">
                        {searchQuery ? "No students match your search." : "No students enrolled in this course."}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(student.name)} flex items-center justify-center text-white font-black text-sm shadow-sm`}
                            >
                              {student.name[0]}
                            </div>
                            <p className="font-black text-slate-900 text-sm">{student.name}</p>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">
                            {student.student_id}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {(["present", "late", "absent"] as AttendanceStatus[]).map((s) => (
                              <button
                                key={s}
                                onClick={() => updateStatus(student.id, s)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                  attendance[student.id] === s
                                    ? s === "present"
                                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100"
                                      : s === "late"
                                      ? "bg-amber-500 text-white shadow-lg shadow-amber-100"
                                      : "bg-rose-500 text-white shadow-lg shadow-rose-100"
                                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              disabled={loading || clearing || students.length === 0}
              onClick={clearAttendance}
              className="px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2"
            >
              {clearing ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
              Clear Attendance
            </button>
            <button
              disabled={saving || students.length === 0}
              onClick={saveAttendance}
              className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 disabled:opacity-50 ${
                saveSuccess
                  ? "bg-emerald-500 text-white shadow-emerald-100"
                  : "bg-slate-900 hover:bg-indigo-600 text-white shadow-slate-200"
              }`}
            >
              {saving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : saveSuccess ? (
                <Check size={18} />
              ) : (
                <Save size={18} />
              )}
              {saveSuccess ? "Saved!" : "Save Attendance"}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────── HISTORY TAB ───────────────── */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Course</label>
              <select
                value={historyCourse}
                onChange={(e) => setHistoryCourse(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20"
              >
                {initialCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchHistory}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Summary Pills */}
          {historyRecords.length > 0 && (
            <div className="flex gap-4 flex-wrap">
              {[
                { label: "Present", count: historyRecords.filter((r) => r.status === "present").length, color: "emerald" },
                { label: "Absent", count: historyRecords.filter((r) => r.status === "absent").length, color: "rose" },
                { label: "Late", count: historyRecords.filter((r) => r.status === "late").length, color: "amber" },
              ].map(({ label, count, color }) => (
                <div key={label} className={`px-5 py-3 bg-${color}-50 rounded-2xl flex items-center gap-3`}>
                  <div className={`w-2.5 h-2.5 rounded-full bg-${color}-500`} />
                  <span className={`text-sm font-black text-${color}-700`}>{count} {label}</span>
                </div>
              ))}
            </div>
          )}

          {/* History Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                    <th className="px-8 py-5">Student</th>
                    <th className="px-8 py-5">Student ID</th>
                    <th className="px-8 py-5">Date</th>
                    <th className="px-8 py-5">Check-in Time</th>
                    <th className="px-8 py-5 text-center">Status</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <Loader2 className="animate-spin text-indigo-600 mx-auto mb-3" size={28} />
                        <p className="text-sm font-bold text-slate-400">Loading records...</p>
                      </td>
                    </tr>
                  ) : historyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-3">
                          <History size={28} />
                        </div>
                        <p className="font-bold text-slate-400">No attendance records for this date.</p>
                      </td>
                    </tr>
                  ) : (
                    historyRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(record.students?.name || "")} flex items-center justify-center text-white font-black text-xs`}
                            >
                              {(record.students?.name || "?")[0]}
                            </div>
                            <p className="font-black text-slate-900 text-sm">{record.students?.name || "Unknown"}</p>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">
                            {record.students?.student_id || "—"}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-sm font-bold text-slate-600">{record.date}</span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs font-medium text-slate-400">
                            {record.check_in_time
                              ? new Date(record.check_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <span
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                              record.status === "present"
                                ? "bg-emerald-50 text-emerald-600"
                                : record.status === "late"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button
                            onClick={() => deleteHistoryRecord(record.id)}
                            className="p-2 text-slate-350 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────── MONTHLY REPORT TAB ───────────────── */}
      {activeTab === "report" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Course</label>
              <select
                value={reportCourse}
                onChange={(e) => setReportCourse(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20"
              >
                {initialCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Month</label>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
            </div>
            <button
              onClick={exportCSV}
              disabled={reportData.length === 0}
              className="px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-40"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>

          {/* Report Cards */}
          {reportLoading ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-20 text-center">
              <Loader2 className="animate-spin text-indigo-600 mx-auto mb-3" size={28} />
              <p className="text-sm font-bold text-slate-400">Generating report...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-20 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto">
                <BarChart3 size={28} />
              </div>
              <p className="font-bold text-slate-400">No attendance data for this period.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                      <th className="px-8 py-5">Student</th>
                      <th className="px-8 py-5 text-center">Present</th>
                      <th className="px-8 py-5 text-center">Late</th>
                      <th className="px-8 py-5 text-center">Absent</th>
                      <th className="px-8 py-5">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {reportData.map(({ student, present, absent, late, total }) => {
                      const pct = total ? Math.round((present / total) * 100) : 0;
                      const isLow = pct < 75;
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(student.name)} flex items-center justify-center text-white font-black text-xs`}
                              >
                                {student.name[0]}
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-sm flex items-center gap-2">
                                  {student.name}
                                  {isLow && <AlertTriangle size={12} className="text-rose-400" />}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold">{student.student_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className="text-sm font-black text-emerald-600">{present}</span>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className="text-sm font-black text-amber-600">{late}</span>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className="text-sm font-black text-rose-600">{absent}</span>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-32">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span
                                className={`text-sm font-black min-w-12 ${
                                  pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"
                                }`}
                              >
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────── WEBCAM SCANNER TAB ───────────────── */}
      {activeTab === "qr" && (
        <div className="space-y-6">
          <WebcamScanner onClose={() => setActiveTab("mark")} />
        </div>
      )}
    </div>
  );
}
