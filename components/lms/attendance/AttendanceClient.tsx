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
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 -mb-px cursor-pointer ${
              activeTab === id
                ? "border-b-2 border-slate-900 dark:border-white text-slate-900 dark:text-white"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ───────────────── MARK ATTENDANCE TAB ───────────────── */}
      {activeTab === "mark" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Course */}
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setSelectedBatch("");
                }}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-slate-400 dark:focus:border-slate-600"
              >
                {initialCourses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {c.title}
                  </option>
                ))}
              </select>

              {/* Batch */}
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-slate-400 dark:focus:border-slate-600"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  All Batches
                </option>
                {initialBatches
                  .filter((b) => b.course_id === selectedCourse)
                  .map((b) => (
                    <option key={b.id} value={b.title} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {b.title}
                    </option>
                  ))}
              </select>

              {/* Date */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-slate-400 dark:focus:border-slate-600"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => markAllAs("present")}
                className="px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors cursor-pointer"
              >
                All Present
              </button>
              <button
                onClick={() => markAllAs("absent")}
                className="px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors cursor-pointer"
              >
                All Absent
              </button>
            </div>
          </div>

          {/* Search & Counters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student by name or ID..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 rounded-md">
                Total: <strong className="text-slate-900 dark:text-white font-semibold">{students.length}</strong>
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-md">
                Present: <strong className="font-semibold">{stats.present}</strong>
              </span>
              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-md">
                Late: <strong className="font-semibold">{stats.late}</strong>
              </span>
              <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-md">
                Absent: <strong className="font-semibold">{stats.absent}</strong>
              </span>
            </div>
          </div>

          {/* Student Attendance List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Student ID</th>
                    <th className="px-5 py-3 text-right">Mark Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-14 text-center">
                        <Loader2 className="animate-spin text-slate-400 mx-auto mb-2" size={22} />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Loading students...</p>
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-14 text-center text-xs text-slate-500 dark:text-slate-400">
                        {searchQuery ? "No students match your search." : "No students enrolled in this course."}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(student.name)} flex items-center justify-center text-white font-semibold text-xs shrink-0`}
                            >
                              {student.name[0]}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white text-sm">
                              {student.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {student.student_id}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {(["present", "late", "absent"] as AttendanceStatus[]).map((s) => (
                              <button
                                key={s}
                                onClick={() => updateStatus(student.id, s)}
                                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                                  attendance[student.id] === s
                                    ? s === "present"
                                      ? "bg-emerald-600 text-white"
                                      : s === "late"
                                      ? "bg-amber-600 text-white"
                                      : "bg-rose-600 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
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

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              disabled={loading || clearing || students.length === 0}
              onClick={clearAttendance}
              className="px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              {clearing ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
              Clear Attendance
            </button>
            <button
              disabled={saving || students.length === 0}
              onClick={saveAttendance}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                saveSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
              }`}
            >
              {saving ? (
                <Loader2 className="animate-spin" size={15} />
              ) : saveSuccess ? (
                <Check size={15} />
              ) : (
                <Save size={15} />
              )}
              {saveSuccess ? "Saved!" : "Save Attendance"}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────── HISTORY TAB ───────────────── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <select
                value={historyCourse}
                onChange={(e) => setHistoryCourse(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-slate-400 dark:focus:border-slate-600"
              >
                {initialCourses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {c.title}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-slate-400 dark:focus:border-slate-600"
              />
            </div>
            <button
              onClick={fetchHistory}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Summary Badges */}
          {historyRecords.length > 0 && (
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-md font-medium">
                Present: {historyRecords.filter((r) => r.status === "present").length}
              </span>
              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-md font-medium">
                Late: {historyRecords.filter((r) => r.status === "late").length}
              </span>
              <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-md font-medium">
                Absent: {historyRecords.filter((r) => r.status === "absent").length}
              </span>
            </div>
          )}

          {/* History Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Student ID</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Check-in</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center">
                        <Loader2 className="animate-spin text-slate-400 mx-auto mb-2" size={22} />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Loading records...</p>
                      </td>
                    </tr>
                  ) : historyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center text-xs text-slate-500 dark:text-slate-400">
                        No attendance records for this date.
                      </td>
                    </tr>
                  ) : (
                    historyRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(record.students?.name || "")} flex items-center justify-center text-white font-semibold text-xs shrink-0`}
                            >
                              {(record.students?.name || "?")[0]}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white text-sm">
                              {record.students?.name || "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {record.students?.student_id || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                          {record.date}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                          {record.check_in_time
                            ? new Date(record.check_in_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                              record.status === "present"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                                : record.status === "late"
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => deleteHistoryRecord(record.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 size={15} />
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
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <select
                value={reportCourse}
                onChange={(e) => setReportCourse(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-slate-400 dark:focus:border-slate-600"
              >
                {initialCourses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {c.title}
                  </option>
                ))}
              </select>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-slate-400 dark:focus:border-slate-600"
              />
            </div>
            <button
              onClick={exportCSV}
              disabled={reportData.length === 0}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>

          {/* Report Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3 text-center">Present</th>
                    <th className="px-5 py-3 text-center">Late</th>
                    <th className="px-5 py-3 text-center">Absent</th>
                    <th className="px-5 py-3">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportLoading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-14 text-center">
                        <Loader2 className="animate-spin text-slate-400 mx-auto mb-2" size={22} />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Generating report...</p>
                      </td>
                    </tr>
                  ) : reportData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-14 text-center text-xs text-slate-500 dark:text-slate-400">
                        No attendance data for this period.
                      </td>
                    </tr>
                  ) : (
                    reportData.map(({ student, present, absent, late, total }) => {
                      const pct = total ? Math.round((present / total) * 100) : 0;
                      const isLow = pct < 75;
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(student.name)} flex items-center justify-center text-white font-semibold text-xs shrink-0`}
                              >
                                {student.name[0]}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                  {student.name}
                                  {isLow && <AlertTriangle size={13} className="text-amber-500" />}
                                </p>
                                <p className="text-[11px] font-mono text-slate-400">{student.student_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium text-emerald-600 dark:text-emerald-400">
                            {present}
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium text-amber-600 dark:text-amber-400">
                            {late}
                          </td>
                          <td className="px-5 py-3.5 text-center font-medium text-rose-600 dark:text-rose-400">
                            {absent}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-28">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span
                                className={`text-xs font-semibold ${
                                  pct >= 75 ? "text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────── WEBCAM SCANNER TAB ───────────────── */}
      {activeTab === "qr" && (
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <WebcamScanner onClose={() => setActiveTab("mark")} />
        </div>
      )}
    </div>
  );
}
