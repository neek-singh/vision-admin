"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Star,
  Circle,
  Check,
  X,
  Edit3,
  Columns,
  Download,
  Loader2,
  UserCheck,
  Bell,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { updateAttendanceCell } from "@/app/actions/lms/attendance";
import Image from "next/image";

type AttendanceStatus = "present" | "late" | "absent";

interface StudentItem {
  id: string;
  name: string;
  student_id: string;
  photo_url?: string | null;
  status?: string;
  batch?: string | null;
}

interface CourseItem {
  id: string;
  title: string;
}

interface BatchItem {
  id: string;
  title: string;
  course_id: string;
}

interface AttendanceMonthlySheetProps {
  initialCourses: CourseItem[];
  initialBatches: BatchItem[];
}

interface EnrollmentResponseItem {
  student_id: string;
  batch: string | null;
  students: {
    id: string;
    name: string | null;
    student_id: string | null;
    photo_url: string | null;
    status: string | null;
  } | null;
}

interface AttendanceResponseItem {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  check_in_time?: string | null;
}

interface HolidayResponseItem {
  id: string;
  title: string | null;
  event_date: string;
  type: string;
  course_id: string | null;
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
];

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Local ISO date format: YYYY-MM-DD (Safe from UTC/IST timezone day rollbacks) */
function formatLocalISO(y: number, m: number, d: number): string {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function AttendanceMonthlySheet({
  initialCourses,
  initialBatches,
}: AttendanceMonthlySheetProps) {
  // Current Month State (YYYY-MM)
  const now = useMemo(() => new Date(), []);
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [currentMonth, setCurrentMonth] = useState<string>(defaultMonth);

  // Filters State
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourses[0]?.id || "");
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusChipFilter, setStatusChipFilter] = useState<AttendanceStatus | null>(null);

  // View Options State
  const [totalsFormat, setTotalsFormat] = useState<"days" | "percent">("days");
  const [showTotalsColumns, setShowTotalsColumns] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  // Data State
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, Record<string, { status: AttendanceStatus; check_in_time?: string }>>
  >({});
  const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});
  const [updatingCellKey, setUpdatingCellKey] = useState<string | null>(null);

  // Refs
  const todayRef = useRef<HTMLTableHeaderCellElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);

  // Date Math
  const [yearStr, monthStr] = currentMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  const daysInMonth = new Date(year, month, 0).getDate();

  const todayISO = formatLocalISO(now.getFullYear(), now.getMonth() + 1, now.getDate());

  // Available batches for selected course
  const availableBatches = useMemo(() => {
    return initialBatches.filter((b) => !b.course_id || b.course_id === selectedCourse);
  }, [initialBatches, selectedCourse]);

  // Generate all days in the current month (1 to daysInMonth)
  const daysList = useMemo(() => {
    const list = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatLocalISO(year, month, d);
      const dObj = new Date(year, month - 1, d);
      const dayOfWeek = dObj.getDay(); // 0 is Sunday
      const isSunday = dayOfWeek === 0;
      const isToday = dateStr === todayISO;
      const isFuture = dateStr > todayISO;
      list.push({
        dayNumber: d,
        dateStr,
        weekdayLetter: WEEKDAY_LETTERS[dayOfWeek],
        isSunday,
        isToday,
        isFuture,
      });
    }
    return list;
  }, [year, month, daysInMonth, todayISO]);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Attendance, Enrollments, and Holidays in a single Promise.all
  useEffect(() => {
    let ignore = false;

    async function loadMonthlyData() {
      await Promise.resolve();
      if (!selectedCourse || ignore) return;
      setLoading(true);

      try {
        const startDate = formatLocalISO(year, month, 1);
        const endDate = formatLocalISO(year, month, daysInMonth);

        let enrollQuery = supabase
          .from("enrollments")
          .select(`
            student_id,
            batch,
            students (
              id,
              name,
              student_id,
              photo_url,
              status
            )
          `)
          .eq("course_id", selectedCourse);

        if (selectedBatch) {
          enrollQuery = enrollQuery.eq("batch", selectedBatch);
        }

        const attendQuery = supabase
          .from("attendance")
          .select("id, student_id, date, status, check_in_time")
          .eq("course_id", selectedCourse)
          .gte("date", startDate)
          .lte("date", endDate);

        const holidaysQuery = supabase
          .from("events")
          .select("id, title, event_date, type, course_id")
          .eq("type", "holiday")
          .gte("event_date", startDate)
          .lte("event_date", endDate);

        const [enrollRes, attendRes, holidayRes] = await Promise.all([
          enrollQuery,
          attendQuery,
          holidaysQuery,
        ]);

        if (ignore) return;
        if (enrollRes.error) throw enrollRes.error;
        if (attendRes.error) throw attendRes.error;
        if (holidayRes.error) throw holidayRes.error;

        const studentList: StudentItem[] = [];
        const seen = new Set<string>();
        const enrollData = (enrollRes.data || []) as unknown as EnrollmentResponseItem[];
        enrollData.forEach((e) => {
          const s = e.students;
          if (s && !seen.has(s.id)) {
            seen.add(s.id);
            studentList.push({
              id: s.id,
              name: s.name || "Unknown",
              student_id: s.student_id || "—",
              photo_url: s.photo_url || null,
              status: s.status || "active",
              batch: e.batch || null,
            });
          }
        });
        setStudents(studentList);

        const aMap: Record<string, Record<string, { status: AttendanceStatus; check_in_time?: string }>> = {};
        const attendData = (attendRes.data || []) as unknown as AttendanceResponseItem[];
        attendData.forEach((r) => {
          if (!aMap[r.student_id]) aMap[r.student_id] = {};
          aMap[r.student_id][r.date] = {
            status: r.status,
            check_in_time: r.check_in_time || undefined,
          };
        });
        setAttendanceMap(aMap);

        const hMap: Record<string, string> = {};
        const holidayData = (holidayRes.data || []) as unknown as HolidayResponseItem[];
        holidayData.forEach((h) => {
          if (!h.course_id || h.course_id === selectedCourse) {
            hMap[h.event_date] = h.title || "Holiday";
          }
        });
        setHolidayMap(hMap);
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Attendance monthly fetch error:", err);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadMonthlyData();

    return () => {
      ignore = true;
    };
  }, [selectedCourse, selectedBatch, year, month, daysInMonth]);

  // Auto-scroll to today column on load / month change
  useEffect(() => {
    if (!loading && todayRef.current && scrollContainerRef.current) {
      const isCurrentMonthVisible =
        now.getFullYear() === year && now.getMonth() + 1 === month;
      if (isCurrentMonthVisible) {
        const container = scrollContainerRef.current;
        const target = todayRef.current;
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const scrollLeftTarget =
          container.scrollLeft +
          (targetRect.left - containerRect.left) -
          container.clientWidth / 2 +
          targetRect.width / 2;
        container.scrollTo({
          left: Math.max(0, scrollLeftTarget),
          behavior: "smooth",
        });
      }
    }
  }, [loading, currentMonth, year, month, now]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const d = new Date(year, month - 2, 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, "0");
    setCurrentMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const d = new Date(year, month, 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, "0");
    setCurrentMonth(`${newY}-${newM}`);
  };

  // Month label format: "October 2026"
  const monthLabel = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [year, month]);

  // Per-student stats calculation (ignoring off-days from totals)
  const studentStats = useMemo(() => {
    const statsMap: Record<
      string,
      {
        present: number;
        late: number;
        absent: number;
        workingAttended: number;
        percentage: number;
        daysStr: string;
      }
    > = {};

    students.forEach((s) => {
      const records = attendanceMap[s.id] || {};
      let present = 0;
      let late = 0;
      let absent = 0;

      daysList.forEach((d) => {
        const isHoliday = Boolean(holidayMap[d.dateStr]);
        const isSun = d.isSunday;
        const isOff = isHoliday || isSun;
        const rec = records[d.dateStr];
        const rawStatus = rec?.status;

        if (isOff) {
          // Off-days (Sundays & Holidays) do NOT count as absent!
          // Only count if explicitly marked present or late
          if (rawStatus === "present") present++;
          else if (rawStatus === "late") late++;
        } else if (!d.isFuture) {
          // Working day (date <= today and not off)
          if (rawStatus === "present") present++;
          else if (rawStatus === "late") late++;
          else absent++; // Either explicitly 'absent' or unrecorded working day
        }
      });

      const workingAttended = present + late;
      const totalEligible = present + late + absent;
      const percentage = totalEligible > 0 ? Math.round((workingAttended / totalEligible) * 100) : 0;
      const daysStr = `${workingAttended}/${totalEligible} days`;

      statsMap[s.id] = {
        present,
        late,
        absent,
        workingAttended,
        percentage,
        daysStr,
      };
    });

    return statsMap;
  }, [students, attendanceMap, daysList, holidayMap]);

  // Aggregate Legend Totals
  const legendCounts = useMemo(() => {
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;

    Object.values(studentStats).forEach((st) => {
      totalPresent += st.present;
      totalLate += st.late;
      totalAbsent += st.absent;
    });

    return {
      present: totalPresent,
      late: totalLate,
      absent: totalAbsent,
      holidays: Object.keys(holidayMap).length,
      sundays: daysList.filter((d) => d.isSunday).length,
    };
  }, [studentStats, holidayMap, daysList]);

  // Filter & Partition Students (Active first, then alphabetical, non-active dimmed at bottom)
  const { activeStudents, inactiveStudents } = useMemo(() => {
    const list = students.filter((s) => {
      // Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q && !s.name.toLowerCase().includes(q) && !s.student_id.toLowerCase().includes(q)) {
        return false;
      }
      // Status dropdown filter
      if (studentStatusFilter === "active" && s.status !== "active") return false;
      if (studentStatusFilter === "inactive" && s.status === "active") return false;

      // Status Chip Filter (Click on legend chips)
      if (statusChipFilter === "present" && (studentStats[s.id]?.present || 0) === 0) return false;
      if (statusChipFilter === "late" && (studentStats[s.id]?.late || 0) === 0) return false;
      if (statusChipFilter === "absent" && (studentStats[s.id]?.absent || 0) === 0) return false;

      return true;
    });

    const active: StudentItem[] = [];
    const inactive: StudentItem[] = [];

    list.forEach((s) => {
      if (s.status === "active" || !s.status) {
        active.push(s);
      } else {
        inactive.push(s);
      }
    });

    active.sort((a, b) => a.name.localeCompare(b.name));
    inactive.sort((a, b) => a.name.localeCompare(b.name));

    return { activeStudents: active, inactiveStudents: inactive };
  }, [students, searchQuery, studentStatusFilter, statusChipFilter, studentStats]);

  const allVisibleStudents = useMemo(() => {
    return [...activeStudents, ...inactiveStudents];
  }, [activeStudents, inactiveStudents]);

  // Select-All handlers
  const isAllSelected =
    allVisibleStudents.length > 0 &&
    allVisibleStudents.every((s) => selectedStudents.has(s.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(allVisibleStudents.map((s) => s.id)));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Cell Click in Edit Mode: cycles present -> late -> absent
  const handleCellClick = async (
    studentId: string,
    dateStr: string,
    currentStatus: AttendanceStatus | undefined,
    isOff: boolean,
    isFuture: boolean
  ) => {
    if (!editMode) return;
    if (isFuture) return;

    // Disabled on Sunday/Holiday unless student already has present or late record
    if (isOff && currentStatus !== "present" && currentStatus !== "late") {
      return;
    }

    let nextStatus: AttendanceStatus = "present";
    if (currentStatus === "present") nextStatus = "late";
    else if (currentStatus === "late") nextStatus = "absent";
    else nextStatus = "present";

    const cellKey = `${studentId}-${dateStr}`;
    setUpdatingCellKey(cellKey);

    // Save previous state for optimistic rollback
    const prevRecord = attendanceMap[studentId]?.[dateStr];

    // Optimistic UI update
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [dateStr]: {
          status: nextStatus,
          check_in_time:
            nextStatus === "present" || nextStatus === "late"
              ? new Date().toISOString()
              : undefined,
        },
      },
    }));

    try {
      const res = await updateAttendanceCell({
        student_id: studentId,
        course_id: selectedCourse,
        date: dateStr,
        status: nextStatus,
      });

      if (res?.error) {
        // Rollback
        setAttendanceMap((prev) => ({
          ...prev,
          [studentId]: {
            ...(prev[studentId] || {}),
            [dateStr]: prevRecord || { status: "absent" },
          },
        }));
        alert(res.error || "Attendance update karne mein dikkat aayi.");
      }
    } catch {
      // Revert on network exception
      setAttendanceMap((prev) => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [dateStr]: prevRecord || { status: "absent" },
        },
      }));
      alert("Network issue: Attendance update nahi ho payi.");
    } finally {
      setUpdatingCellKey(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Student Name",
      "Student ID",
      "Status",
      "Present (P)",
      "Late (L)",
      "Absent (A)",
      "Attended Days",
      "Total Working Days",
      "Attendance %",
    ];

    const rows = allVisibleStudents.map((s) => {
      const st = studentStats[s.id] || {
        present: 0,
        late: 0,
        absent: 0,
        workingAttended: 0,
        percentage: 0,
      };
      return [
        `"${s.name.replace(/"/g, '""')}"`,
        s.student_id,
        s.status || "active",
        st.present,
        st.late,
        st.absent,
        st.workingAttended,
        st.present + st.late + st.absent,
        `${st.percentage}%`,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${currentMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* ───────────────── TOP BAR CONTROLS ───────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left Group: Month Picker with prev/next & Filter button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Picker Box */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-1 shadow-2xs">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Pichhla mahina"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="relative flex items-center px-2 py-0.5">
                <CalendarIcon size={14} className="text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 min-w-28 text-center select-none">
                  {monthLabel}
                </span>
                <input
                  type="month"
                  value={currentMonth}
                  onChange={(e) => e.target.value && setCurrentMonth(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  aria-label="Select month and year"
                />
              </div>

              <button
                onClick={handleNextMonth}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Agla mahina"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* + Add Filter Popover */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  selectedBatch || studentStatusFilter !== "all"
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300"
                    : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <Filter size={13} />
                <span>+ Add Filter</span>
                {(selectedBatch || studentStatusFilter !== "all") && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Sheet Filters</span>
                    <button
                      onClick={() => {
                        setSelectedBatch("");
                        setStudentStatusFilter("all");
                      }}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Reset All
                    </button>
                  </div>

                  {/* Course Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Course</label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => {
                        setSelectedCourse(e.target.value);
                        setSelectedBatch("");
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium outline-none"
                    >
                      {initialCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Batch</label>
                    <select
                      value={selectedBatch}
                      onChange={(e) => setSelectedBatch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium outline-none"
                    >
                      <option value="">All Batches</option>
                      {availableBatches.map((b) => (
                        <option key={b.id} value={b.title}>
                          {b.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Student Status Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Student Status</label>
                    <select
                      value={studentStatusFilter}
                      onChange={(e) => setStudentStatusFilter(e.target.value as "all" | "active" | "inactive")}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium outline-none"
                    >
                      <option value="all">All Students (Active + Left/Dropout)</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive / Dropout Only</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Course Selector (Visible on larger screens) */}
            <div className="hidden sm:block">
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setSelectedBatch("");
                }}
                className="bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none cursor-pointer"
              >
                {initialCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Group: Search, Totals Toggle, Edit Mode, Export */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Days vs % Toggle Button */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setTotalsFormat("days")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  totalsFormat === "days"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Show totals as 18/22 days"
              >
                Days
              </button>
              <button
                onClick={() => setTotalsFormat("percent")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  totalsFormat === "percent"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Show totals as percentage (82%)"
              >
                %
              </button>
            </div>

            {/* Toggle Totals Columns Show/Hide */}
            <button
              onClick={() => setShowTotalsColumns((prev) => !prev)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                showTotalsColumns
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
              title={showTotalsColumns ? "Hide totals columns" : "Show totals columns"}
              aria-label="Toggle totals columns"
            >
              <Columns size={15} />
            </button>

            {/* Edit Mode Toggle */}
            <button
              onClick={() => setEditMode((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                editMode
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs shadow-amber-200 dark:shadow-none animate-pulse"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
              title="Click cells to cycle Present -> Late -> Absent"
            >
              <Edit3 size={13} />
              <span>{editMode ? "Editing Active" : "Edit Mode"}</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={allVisibleStudents.length === 0}
              className="p-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
              title="Export CSV"
              aria-label="Export CSV"
            >
              <Download size={15} />
            </button>
          </div>
        </div>

        {/* ───────────────── LEGEND CHIPS ROW ───────────────── */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          {/* Present Filter Chip */}
          <button
            onClick={() =>
              setStatusChipFilter((prev) => (prev === "present" ? null : "present"))
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
              statusChipFilter === "present"
                ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs scale-105"
                : "bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            }`}
            title="Click to filter students with Present status"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check size={11} className="stroke-[3]" />
            </span>
            <span>Attended / Present</span>
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-200/60 dark:bg-emerald-900/60 rounded-full text-[10px] font-bold">
              {legendCounts.present}
            </span>
          </button>

          {/* Late Filter Chip */}
          <button
            onClick={() =>
              setStatusChipFilter((prev) => (prev === "late" ? null : "late"))
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
              statusChipFilter === "late"
                ? "bg-amber-600 text-white border-amber-700 shadow-2xs scale-105"
                : "bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
            }`}
            title="Click to filter students with Late status"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Circle size={10} className="text-amber-600 dark:text-amber-400 stroke-[3]" />
            </span>
            <span>Late</span>
            <span className="ml-1 px-1.5 py-0.2 bg-amber-200/60 dark:bg-amber-900/60 rounded-full text-[10px] font-bold">
              {legendCounts.late}
            </span>
          </button>

          {/* Absent Filter Chip */}
          <button
            onClick={() =>
              setStatusChipFilter((prev) => (prev === "absent" ? null : "absent"))
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
              statusChipFilter === "absent"
                ? "bg-rose-600 text-white border-rose-700 shadow-2xs scale-105"
                : "bg-rose-50 text-rose-800 border-rose-200/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
            }`}
            title="Click to filter students with Absent status"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500/20 flex items-center justify-center">
              <X size={11} className="stroke-[3]" />
            </span>
            <span>Absent</span>
            <span className="ml-1 px-1.5 py-0.2 bg-rose-200/60 dark:bg-rose-900/60 rounded-full text-[10px] font-bold">
              {legendCounts.absent}
            </span>
          </button>

          {/* Holiday Info Chip (Non-filter) */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-purple-50 text-purple-800 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-semibold select-none">
            <span className="w-3.5 h-3.5 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Star size={10} className="fill-purple-600 dark:fill-purple-400 stroke-none" />
            </span>
            <span>Holiday</span>
            {legendCounts.holidays > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-purple-200/60 dark:bg-purple-900/60 rounded-full text-[10px] font-bold">
                {legendCounts.holidays}
              </span>
            )}
          </div>

          {/* Sunday / Off-day Info Chip (Non-filter) */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-semibold select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 inline-block" />
            <span>Time off / Sunday</span>
            <span className="ml-1 px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 rounded-full text-[10px] font-bold">
              {legendCounts.sundays}
            </span>
          </div>

          {statusChipFilter && (
            <button
              onClick={() => setStatusChipFilter(null)}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline cursor-pointer"
            >
              <RotateCcw size={11} /> Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* ───────────────── ATTENDANCE GRID TABLE ───────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
        <div ref={scrollContainerRef} className="overflow-x-auto max-w-full">
          <table className="w-full text-left text-sm border-collapse select-none">
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md">
                {/* Sticky Left Column: Select All & Student Name */}
                <th className="sticky left-0 z-30 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-md px-4 py-3 min-w-56 sm:min-w-64 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
                      aria-label="Select all students"
                    />
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Student Name ({allVisibleStudents.length})
                    </span>
                  </div>
                </th>

                {/* Day Columns (1 to daysInMonth) */}
                {daysList.map((d) => {
                  const isHoliday = Boolean(holidayMap[d.dateStr]);
                  const holidayTitle = holidayMap[d.dateStr];
                  const isSun = d.isSunday;

                  return (
                    <th
                      key={d.dayNumber}
                      ref={d.isToday ? todayRef : null}
                      className={`text-center px-1 py-2.5 min-w-11 max-w-12 border-r border-slate-100 dark:border-slate-800/70 transition-colors ${
                        d.isToday
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 ring-2 ring-indigo-500/70 z-10"
                          : isHoliday
                          ? "bg-purple-50/60 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300"
                          : isSun
                          ? "bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                      title={
                        isHoliday
                          ? `Holiday: ${holidayTitle} (${d.dateStr})`
                          : isSun
                          ? `Sunday (${d.dateStr})`
                          : d.isToday
                          ? `Today (${d.dateStr})`
                          : d.dateStr
                      }
                    >
                      <div className="flex flex-col items-center">
                        <span
                          className={`text-xs font-black ${
                            d.isToday
                              ? "text-indigo-600 dark:text-indigo-400"
                              : isHoliday
                              ? "text-purple-600 dark:text-purple-400"
                              : ""
                          }`}
                        >
                          {String(d.dayNumber).padStart(2, "0")}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 mt-0.5">
                          {d.weekdayLetter}
                        </span>
                        {isHoliday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-0.5" />
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Totals Columns (P, L, A, and Total/%) */}
                {showTotalsColumns && (
                  <>
                    <th className="px-3 py-2.5 text-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 min-w-10">
                      P
                    </th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-slate-50 dark:bg-slate-800/80 min-w-10">
                      L
                    </th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-slate-50 dark:bg-slate-800/80 min-w-10">
                      A
                    </th>
                    <th className="px-3.5 py-2.5 text-center text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 min-w-20">
                      {totalsFormat === "days" ? "Days" : "%"}
                    </th>
                  </>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {loading ? (
                <tr>
                  <td
                    colSpan={daysList.length + (showTotalsColumns ? 5 : 1)}
                    className="px-5 py-20 text-center"
                  >
                    <Loader2 className="animate-spin text-indigo-600 mx-auto mb-3" size={26} />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Attendance sheet load ho rahi hai...
                    </p>
                  </td>
                </tr>
              ) : allVisibleStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={daysList.length + (showTotalsColumns ? 5 : 1)}
                    className="px-5 py-20 text-center text-xs text-slate-500 dark:text-slate-400"
                  >
                    {searchQuery
                      ? "Koi bhi student is search match nahi hua."
                      : "Is course/batch mein koi student enrolled nahi hai."}
                  </td>
                </tr>
              ) : (
                <>
                  {/* Active Students Rows */}
                  {activeStudents.map((student) =>
                    renderStudentRow(student, false)
                  )}

                  {/* Non-Active Students Section Divider */}
                  {inactiveStudents.length > 0 && (
                    <>
                      <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700/80">
                        <td
                          colSpan={daysList.length + (showTotalsColumns ? 5 : 1)}
                          className="px-4 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                        >
                          Active nahi hain (Left / Dropout / Inactive — {inactiveStudents.length})
                        </td>
                      </tr>
                      {inactiveStudents.map((student) =>
                        renderStudentRow(student, true)
                      )}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────── FLOATING MULTI-SELECT BAR ───────────────── */}
      {selectedStudents.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 px-5 py-3 flex items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center gap-2.5">
            <UserCheck size={18} className="text-emerald-400" />
            <span className="text-xs font-bold">
              {selectedStudents.size} student{selectedStudents.size > 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedStudents(new Set())}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-indigo-600/50 text-white/60 rounded-xl cursor-not-allowed opacity-70"
              title="Bulk notification feature jald hi aayega"
            >
              <Bell size={13} />
              <span>Notify</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Helper to render individual student row
  function renderStudentRow(student: StudentItem, isDimmed: boolean) {
    const isSelected = selectedStudents.has(student.id);
    const st = studentStats[student.id] || {
      present: 0,
      late: 0,
      absent: 0,
      workingAttended: 0,
      percentage: 0,
      daysStr: "0/0 days",
    };

    return (
      <tr
        key={student.id}
        className={`transition-colors ${
          isSelected
            ? "bg-indigo-50/50 dark:bg-indigo-950/20"
            : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
        } ${isDimmed ? "opacity-60" : ""}`}
      >
        {/* Sticky Student Details Cell */}
        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 backdrop-blur-md px-4 py-2.5 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleToggleSelectStudent(student.id)}
              className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer shrink-0"
              aria-label={`Select ${student.name}`}
            />

            {/* Avatar */}
            {student.photo_url ? (
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 relative">
                <Image
                  src={student.photo_url}
                  alt={student.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(
                  student.name
                )} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs`}
              >
                {getInitials(student.name)}
              </div>
            )}

            {/* Name & ID */}
            <div className="min-w-0 pr-2">
              <p className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-36 sm:max-w-44">
                {student.name}
              </p>
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
                {student.student_id}
              </p>
            </div>
          </div>
        </td>

        {/* Day Tile Cells (1 to daysInMonth) */}
        {daysList.map((d) => {
          const isHoliday = Boolean(holidayMap[d.dateStr]);
          const holidayTitle = holidayMap[d.dateStr];
          const isSun = d.isSunday;
          const isOff = isHoliday || isSun;
          const record = attendanceMap[student.id]?.[d.dateStr];
          const rawStatus = record?.status;
          const checkInTime = record?.check_in_time
            ? new Date(record.check_in_time).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : null;

          const isCellUpdating = updatingCellKey === `${student.id}-${d.dateStr}`;

          // Status & Tile Classification
          let tileType: "present" | "late" | "absent" | "holiday" | "sunday" | "future";
          let statusLabel = "";

          if (d.isFuture) {
            tileType = "future";
            statusLabel = "Future date";
          } else if (isHoliday) {
            if (rawStatus === "present") {
              tileType = "present";
              statusLabel = "Present on Holiday";
            } else if (rawStatus === "late") {
              tileType = "late";
              statusLabel = "Late on Holiday";
            } else {
              tileType = "holiday";
              statusLabel = `Holiday: ${holidayTitle}`;
            }
          } else if (isSun) {
            if (rawStatus === "present") {
              tileType = "present";
              statusLabel = "Present on Sunday";
            } else if (rawStatus === "late") {
              tileType = "late";
              statusLabel = "Late on Sunday";
            } else {
              tileType = "sunday";
              statusLabel = "Sunday / Off";
            }
          } else {
            // Regular working day
            if (rawStatus === "present") {
              tileType = "present";
              statusLabel = "Present";
            } else if (rawStatus === "late") {
              tileType = "late";
              statusLabel = "Late";
            } else {
              tileType = "absent";
              statusLabel = "Absent";
            }
          }

          // Tooltip text
          const tooltip = isHoliday && tileType === "holiday"
            ? `${student.name} • ${d.dateStr} • Holiday: ${holidayTitle}`
            : isSun && tileType === "sunday"
            ? `${student.name} • ${d.dateStr} • Sunday / Off`
            : `${student.name} • ${d.dateStr} • ${statusLabel}${
                checkInTime ? ` • ${checkInTime}` : ""
              }`;

          // Is cell clickable in edit mode
          const isClickable =
            editMode &&
            !d.isFuture &&
            (!isOff || rawStatus === "present" || rawStatus === "late");

          return (
            <td
              key={d.dayNumber}
              className={`text-center p-1 border-r border-slate-100 dark:border-slate-800/70 ${
                d.isToday
                  ? "bg-indigo-50/30 dark:bg-indigo-950/20"
                  : isSun
                  ? "bg-slate-50/50 dark:bg-slate-800/20"
                  : ""
              }`}
            >
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() =>
                    handleCellClick(student.id, d.dateStr, rawStatus, isOff, d.isFuture)
                  }
                  title={tooltip}
                  aria-label={`${student.name}, ${d.dayNumber} ${monthLabel}, ${statusLabel}`}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    isClickable
                      ? "cursor-pointer hover:scale-110 active:scale-95 ring-offset-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      : "cursor-default"
                  } ${
                    isCellUpdating
                      ? "opacity-50 animate-pulse bg-slate-100 dark:bg-slate-800"
                      : tileType === "present"
                      ? "bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs text-emerald-600 dark:text-emerald-400 hover:border-emerald-300"
                      : tileType === "late"
                      ? "bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs text-amber-500 dark:text-amber-400 hover:border-amber-300"
                      : tileType === "absent"
                      ? "bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs text-rose-600 dark:text-rose-400 hover:border-rose-300"
                      : tileType === "holiday"
                      ? "bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs text-purple-600 dark:text-purple-400"
                      : tileType === "sunday"
                      ? "bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 text-slate-400 dark:text-slate-500"
                      : "border border-dashed border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 opacity-30"
                  }`}
                >
                  {isCellUpdating ? (
                    <Loader2 size={13} className="animate-spin text-slate-500" />
                  ) : tileType === "present" ? (
                    <CheckCircle2 size={17} className="text-emerald-500 dark:text-emerald-400" />
                  ) : tileType === "late" ? (
                    <Circle size={15} className="text-amber-500 dark:text-amber-400 stroke-[2.5]" />
                  ) : tileType === "absent" ? (
                    <XCircle size={17} className="text-rose-500 dark:text-rose-400" />
                  ) : tileType === "holiday" ? (
                    <Star size={14} className="fill-purple-500 dark:fill-purple-400 text-purple-500 dark:text-purple-400" />
                  ) : tileType === "sunday" ? (
                    <Circle size={8} className="fill-slate-400 dark:fill-slate-500 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">—</span>
                  )}
                </button>
              </div>
            </td>
          );
        })}

        {/* Totals Columns */}
        {showTotalsColumns && (
          <>
            <td className="px-3 py-2 text-center font-bold text-xs text-emerald-600 dark:text-emerald-400 border-l border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
              {st.present}
            </td>
            <td className="px-3 py-2 text-center font-bold text-xs text-amber-600 dark:text-amber-400 bg-slate-50/40 dark:bg-slate-800/20">
              {st.late}
            </td>
            <td className="px-3 py-2 text-center font-bold text-xs text-rose-600 dark:text-rose-400 bg-slate-50/40 dark:bg-slate-800/20">
              {st.absent}
            </td>
            <td className="px-3 py-2 text-center text-xs bg-slate-50/40 dark:bg-slate-800/20">
              {totalsFormat === "days" ? (
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {st.daysStr}
                </span>
              ) : (
                <span
                  className={`font-mono font-bold ${
                    st.percentage >= 75
                      ? "text-emerald-600 dark:text-emerald-400"
                      : st.percentage >= 50
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {st.percentage}%
                </span>
              )}
            </td>
          </>
        )}
      </tr>
    );
  }
}
