"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Clock,
  BookOpen,
  FileText,
  PenTool,
  FolderPlus,
  HelpCircle,
  Flag,
  Sparkles,
  Maximize2,
  Minimize2,
  Menu,
  X,
  ChevronDown,
  Copy,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Layers,
  GripVertical,
  CalendarDays,
  Check,
  CheckSquare
} from "lucide-react";
import {
  createSchedule,
  deleteSchedule,
  updateScheduleDate,
  duplicateSchedule,
  getCurriculumTopics
} from "@/app/actions/lms/schedule";

// Color & styling configuration matching Google Calendar + Vision LMS
const CATEGORY_CONFIG: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    dot: string;
    label: string;
    icon: any;
  }
> = {
  class: {
    bg: "bg-blue-600 hover:bg-blue-700 text-white",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500",
    badgeBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    dot: "bg-blue-600",
    label: "Live Classes",
    icon: <BookOpen size={13} className="shrink-0" />
  },
  test: {
    bg: "bg-rose-600 hover:bg-rose-700 text-white",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500",
    badgeBg: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    dot: "bg-rose-600",
    label: "Tests & Exams",
    icon: <FileText size={13} className="shrink-0" />
  },
  assignment: {
    bg: "bg-amber-600 hover:bg-amber-700 text-white",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500",
    badgeBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    dot: "bg-amber-600",
    label: "Assignments",
    icon: <PenTool size={13} className="shrink-0" />
  },
  project: {
    bg: "bg-purple-600 hover:bg-purple-700 text-white",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500",
    badgeBg: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    dot: "bg-purple-600",
    label: "Projects",
    icon: <FolderPlus size={13} className="shrink-0" />
  },
  quiz: {
    bg: "bg-emerald-600 hover:bg-emerald-700 text-white",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-600",
    label: "Quizzes",
    icon: <HelpCircle size={13} className="shrink-0" />
  },
  holiday: {
    bg: "bg-emerald-600 hover:bg-emerald-700 text-white",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-600",
    label: "Holidays",
    icon: <Flag size={13} className="shrink-0" />
  },
  event: {
    bg: "bg-violet-600 hover:bg-violet-700 text-white",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500",
    badgeBg: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    dot: "bg-violet-600",
    label: "Institute Events",
    icon: <Sparkles size={13} className="shrink-0" />
  }
};

function getCatCfg(type: string) {
  return CATEGORY_CONFIG[type] || CATEGORY_CONFIG.class;
}

function formatDateStr(y: number, m: number, d: number) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

const WEEKDAY_NAMES_7 = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_NAMES_5 = ["MON", "TUE", "WED", "THU", "FRI"];
const MINI_WEEKDAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

export type ViewMode = "day" | "week" | "month" | "year" | "schedule" | "4days";

const VIEW_CONFIG: Array<{ key: ViewMode; label: string; shortcut: string }> = [
  { key: "day", label: "Day", shortcut: "D" },
  { key: "week", label: "Week", shortcut: "W" },
  { key: "month", label: "Month", shortcut: "M" },
  { key: "year", label: "Year", shortcut: "Y" },
  { key: "schedule", label: "Schedule", shortcut: "A" },
  { key: "4days", label: "4 days", shortcut: "X" }
];

// Helper: Parse HH:MM to total minutes
function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 9 * 60; // default 9:00 AM
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return Math.min(23 * 60 + 59, Math.max(0, h * 60 + m));
}

// Helper: Calculate absolute top and height for 60px/hour time-grid
function getEventStyle(item: any, hourHeight = 60) {
  const startMins = parseTimeToMinutes(item.start_time);
  let endMins = parseTimeToMinutes(item.end_time);
  if (endMins <= startMins) {
    endMins = startMins + 60; // 1 hour duration default
  }
  const duration = Math.max(30, endMins - startMins);
  const pxPerMin = hourHeight / 60;

  return {
    top: `${startMins * pxPerMin}px`,
    height: `${Math.max(28, duration * pxPerMin)}px`
  };
}

// Helper: Sub-column layout for overlapping events
function computeEventColumns(events: any[]) {
  const sorted = [...events].sort((a, b) => {
    const aStart = parseTimeToMinutes(a.start_time);
    const bStart = parseTimeToMinutes(b.start_time);
    return aStart - bStart;
  });

  const columns: any[][] = [];
  sorted.forEach((ev) => {
    const evStart = parseTimeToMinutes(ev.start_time);
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const lastInCol = columns[c][columns[c].length - 1];
      const lastEnd =
        parseTimeToMinutes(lastInCol.end_time) ||
        parseTimeToMinutes(lastInCol.start_time) + 60;
      if (lastEnd <= evStart) {
        columns[c].push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([ev]);
    }
  });

  const resultMap = new Map<string, { colIndex: number; totalCols: number }>();
  const totalCols = Math.max(1, Math.min(3, columns.length));
  columns.forEach((col, colIdx) => {
    col.forEach((ev) => {
      resultMap.set(ev.id, {
        colIndex: Math.min(colIdx, totalCols - 1),
        totalCols
      });
    });
  });

  return resultMap;
}

// 24 Hour Slots definition
const HOURS_24 = Array.from({ length: 24 }, (_, i) => {
  const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
  const ampm = i < 12 ? "AM" : "PM";
  return {
    hour24: i,
    label: i === 0 ? "" : `${hour12} ${ampm}`
  };
});

interface Props {
  initialSchedules: any[];
  courses: any[];
  batches: string[];
  batchesList: any[];
}

export default function GoogleCalendarClient({
  initialSchedules,
  courses,
  batches,
  batchesList
}: Props) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(
    () => formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  // Dynamic timezone label matching user's locale (e.g. GMT+05:30)
  const timezoneLabel = useMemo(() => {
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
    const mins = String(Math.abs(offset) % 60).padStart(2, "0");
    return `GMT${sign}${hours}:${mins}`;
  }, []);

  // Real-time current minutes for red indicator line
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Core calendar state
  const [schedules, setSchedules] = useState(initialSchedules);
  useEffect(() => {
    setSchedules(initialSchedules);
  }, [initialSchedules]);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  // Mini calendar state
  const [miniYear, setMiniYear] = useState(today.getFullYear());
  const [miniMonth, setMiniMonth] = useState(today.getMonth());

  // Views & UI states
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const timeGridScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to 8:00 AM on time-grid views
  useEffect(() => {
    if (viewMode === "week" || viewMode === "4days" || viewMode === "day") {
      if (timeGridScrollRef.current) {
        timeGridScrollRef.current.scrollTop = 460;
      }
    }
  }, [viewMode]);

  // Preferences toggles (from user reference screenshot)
  const [showWeekends, setShowWeekends] = useState(true);
  const [showDeclinedEvents, setShowDeclinedEvents] = useState(true);
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);

  // Google Tasks side panel state
  const [isTasksPanelOpen, setIsTasksPanelOpen] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState("All Batches");

  // Layer filters
  const [layerFilters, setLayerFilters] = useState<Record<string, boolean>>({
    class: true,
    test: true,
    assignment: true,
    project: true,
    quiz: true,
    holiday: true,
    event: true
  });

  // Drag and drop state
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);

  // Inspector modal state
  const [inspectingDate, setInspectingDate] = useState<string | null>(null);

  // Create new schedule modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    course_id: courses[0]?.id || "",
    batch: "All Batches",
    type: "class" as any,
    title: "",
    description: "",
    date: todayStr,
    start_time: "10:00",
    end_time: "11:30"
  });

  // Curriculum drawer in sidebar
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [curriculumCourseId, setCurriculumCourseId] = useState(
    courses[0]?.id || ""
  );
  const [curriculumData, setCurriculumData] = useState<{
    modules: any[];
    tests: any[];
    materials: any[];
  }>({ modules: [], tests: [], materials: [] });
  const [curriculumLoading, setCurriculumLoading] = useState(false);

  // Close view dropdown on outside click
  useEffect(() => {
    if (!isViewDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        viewDropdownRef.current &&
        !viewDropdownRef.current.contains(e.target as Node)
      ) {
        setIsViewDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isViewDropdownOpen]);

  // Global Keyboard Shortcuts (D, W, M, Y, A, X, T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (e.target as HTMLElement)?.tagName;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(activeTag) ||
        inspectingDate ||
        showCreateModal
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "d") {
        setViewMode("day");
        setIsViewDropdownOpen(false);
      } else if (key === "w") {
        setViewMode("week");
        setIsViewDropdownOpen(false);
      } else if (key === "m") {
        setViewMode("month");
        setIsViewDropdownOpen(false);
      } else if (key === "y") {
        setViewMode("year");
        setIsViewDropdownOpen(false);
      } else if (key === "a") {
        setViewMode("schedule");
        setIsViewDropdownOpen(false);
      } else if (key === "x") {
        setViewMode("4days");
        setIsViewDropdownOpen(false);
      } else if (key === "t") {
        handleJumpToday();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspectingDate, showCreateModal]);

  // Load curriculum topics when course changes or opened
  useEffect(() => {
    if ((!curriculumOpen && !isTasksPanelOpen) || !curriculumCourseId) return;
    let isMounted = true;
    setCurriculumLoading(true);
    getCurriculumTopics(curriculumCourseId).then((res) => {
      if (isMounted) {
        setCurriculumData(res);
        setCurriculumLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [curriculumOpen, isTasksPanelOpen, curriculumCourseId]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Synchronize mini calendar with main view
  useEffect(() => {
    setMiniYear(currentYear);
    setMiniMonth(currentMonth);
  }, [currentYear, currentMonth]);

  // Jump to today
  const handleJumpToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateStr(todayStr);
    setMiniYear(today.getFullYear());
    setMiniMonth(today.getMonth());
  };

  // Month / Nav Chevrons
  const handlePrev = () => {
    if (viewMode === "year") {
      setCurrentYear((y) => y - 1);
    } else if (viewMode === "month") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
    } else if (viewMode === "week") {
      const cur = new Date(selectedDateStr + "T00:00:00");
      cur.setDate(cur.getDate() - (showWeekends ? 7 : 5));
      const newStr = formatDateStr(
        cur.getFullYear(),
        cur.getMonth(),
        cur.getDate()
      );
      setSelectedDateStr(newStr);
      setCurrentMonth(cur.getMonth());
      setCurrentYear(cur.getFullYear());
    } else if (viewMode === "4days") {
      const cur = new Date(selectedDateStr + "T00:00:00");
      cur.setDate(cur.getDate() - 4);
      const newStr = formatDateStr(
        cur.getFullYear(),
        cur.getMonth(),
        cur.getDate()
      );
      setSelectedDateStr(newStr);
      setCurrentMonth(cur.getMonth());
      setCurrentYear(cur.getFullYear());
    } else {
      const cur = new Date(selectedDateStr + "T00:00:00");
      cur.setDate(cur.getDate() - 1);
      const newStr = formatDateStr(
        cur.getFullYear(),
        cur.getMonth(),
        cur.getDate()
      );
      setSelectedDateStr(newStr);
      setCurrentMonth(cur.getMonth());
      setCurrentYear(cur.getFullYear());
    }
  };

  const handleNext = () => {
    if (viewMode === "year") {
      setCurrentYear((y) => y + 1);
    } else if (viewMode === "month") {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
    } else if (viewMode === "week") {
      const cur = new Date(selectedDateStr + "T00:00:00");
      cur.setDate(cur.getDate() + (showWeekends ? 7 : 5));
      const newStr = formatDateStr(
        cur.getFullYear(),
        cur.getMonth(),
        cur.getDate()
      );
      setSelectedDateStr(newStr);
      setCurrentMonth(cur.getMonth());
      setCurrentYear(cur.getFullYear());
    } else if (viewMode === "4days") {
      const cur = new Date(selectedDateStr + "T00:00:00");
      cur.setDate(cur.getDate() + 4);
      const newStr = formatDateStr(
        cur.getFullYear(),
        cur.getMonth(),
        cur.getDate()
      );
      setSelectedDateStr(newStr);
      setCurrentMonth(cur.getMonth());
      setCurrentYear(cur.getFullYear());
    } else {
      const cur = new Date(selectedDateStr + "T00:00:00");
      cur.setDate(cur.getDate() + 1);
      const newStr = formatDateStr(
        cur.getFullYear(),
        cur.getMonth(),
        cur.getDate()
      );
      setSelectedDateStr(newStr);
      setCurrentMonth(cur.getMonth());
      setCurrentYear(cur.getFullYear());
    }
  };

  // Mini calendar navigation
  const handlePrevMini = () => {
    if (miniMonth === 0) {
      setMiniMonth(11);
      setMiniYear((y) => y - 1);
    } else {
      setMiniMonth((m) => m - 1);
    }
  };

  const handleNextMini = () => {
    if (miniMonth === 11) {
      setMiniMonth(0);
      setMiniYear((y) => y + 1);
    } else {
      setMiniMonth((m) => m + 1);
    }
  };

  // Toggle category layer
  const toggleLayer = (catKey: string) => {
    setLayerFilters((prev) => ({
      ...prev,
      [catKey]: !prev[catKey]
    }));
  };

  // Filtered schedules based on course, batch, layer, search & preferences
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (!showCompletedTasks && s.date && s.date < todayStr) {
        return false;
      }
      if (selectedCourseId !== "all") {
        const cId = s.course_id || s.courses?.id;
        if (cId && cId !== selectedCourseId) return false;
      }
      if (selectedBatch !== "All Batches") {
        if (s.batch && s.batch !== "All Batches" && s.batch !== selectedBatch) {
          return false;
        }
      }
      if (layerFilters[s.type] === false) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = s.title?.toLowerCase().includes(q);
        const descMatch = s.description?.toLowerCase().includes(q);
        const courseMatch = s.courses?.title?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !courseMatch) return false;
      }
      return true;
    });
  }, [
    schedules,
    selectedCourseId,
    selectedBatch,
    layerFilters,
    searchQuery,
    showCompletedTasks,
    todayStr
  ]);

  // Schedules grouped by date string
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const s of filteredSchedules) {
      if (!s.date) continue;
      const arr = map.get(s.date) || [];
      arr.push(s);
      map.set(s.date, arr);
    }
    map.forEach((items) => {
      items.sort((a, b) =>
        (a.start_time || "").localeCompare(b.start_time || "")
      );
    });
    return map;
  }, [filteredSchedules]);

  // Compute month cells for Month View (5 cols or 7 cols depending on showWeekends)
  const monthCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      dayOfWeek: number;
      isCurrentMonth: boolean;
      isFirstOfMonth: boolean;
      monthLabel: string;
      isToday: boolean;
    }> = [];

    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateStr = formatDateStr(prevYear, prevMonth, dayNum);
      const dObj = new Date(prevYear, prevMonth, dayNum);
      cells.push({
        dateStr,
        dayNum,
        dayOfWeek: dObj.getDay(),
        isCurrentMonth: false,
        isFirstOfMonth: dayNum === 1,
        monthLabel: SHORT_MONTH_NAMES[prevMonth],
        isToday: dateStr === todayStr
      });
    }

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = formatDateStr(currentYear, currentMonth, d);
      const dObj = new Date(currentYear, currentMonth, d);
      cells.push({
        dateStr,
        dayNum: d,
        dayOfWeek: dObj.getDay(),
        isCurrentMonth: true,
        isFirstOfMonth: d === 1,
        monthLabel: SHORT_MONTH_NAMES[currentMonth],
        isToday: dateStr === todayStr
      });
    }

    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const totalTarget = cells.length > 35 ? 42 : 35;
    const remaining = totalTarget - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = formatDateStr(nextYear, nextMonth, d);
      const dObj = new Date(nextYear, nextMonth, d);
      cells.push({
        dateStr,
        dayNum: d,
        dayOfWeek: dObj.getDay(),
        isCurrentMonth: false,
        isFirstOfMonth: d === 1,
        monthLabel: SHORT_MONTH_NAMES[nextMonth],
        isToday: dateStr === todayStr
      });
    }

    if (!showWeekends) {
      return cells.filter((c) => c.dayOfWeek !== 0 && c.dayOfWeek !== 6);
    }

    return cells;
  }, [currentYear, currentMonth, todayStr, showWeekends]);

  // Compute mini calendar cells
  const miniCells = useMemo(() => {
    const firstDayIndex = new Date(miniYear, miniMonth, 1).getDay();
    const daysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate();
    const daysInPrev = new Date(miniYear, miniMonth, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const prevY = miniMonth === 0 ? miniYear - 1 : miniYear;
    const prevM = miniMonth === 0 ? 11 : miniMonth - 1;
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrev - i;
      const dateStr = formatDateStr(prevY, prevM, dayNum);
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDateStr(miniYear, miniMonth, d);
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr
      });
    }

    const nextY = miniMonth === 11 ? miniYear + 1 : miniYear;
    const nextM = miniMonth === 11 ? 0 : miniMonth + 1;
    const total = cells.length > 35 ? 42 : 35;
    const remaining = total - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = formatDateStr(nextY, nextM, d);
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr
      });
    }

    return cells;
  }, [miniYear, miniMonth, todayStr, selectedDateStr]);

  // Compute Week View days (5 or 7 days)
  const weekDays = useMemo(() => {
    const cur = new Date(selectedDateStr + "T00:00:00");
    const dayOfWeek = cur.getDay();
    const startOfWeek = new Date(cur);
    startOfWeek.setDate(cur.getDate() - dayOfWeek);

    const days: Array<{
      dateStr: string;
      dayName: string;
      dayNum: number;
      isToday: boolean;
      dayOfWeek: number;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const str = formatDateStr(d.getFullYear(), d.getMonth(), d.getDate());
      days.push({
        dateStr: str,
        dayName: WEEKDAY_NAMES_7[i],
        dayNum: d.getDate(),
        isToday: str === todayStr,
        dayOfWeek: i
      });
    }

    if (!showWeekends) {
      return days.filter((d) => d.dayOfWeek !== 0 && d.dayOfWeek !== 6);
    }
    return days;
  }, [selectedDateStr, todayStr, showWeekends]);

  // Compute 4 Days View
  const fourDays = useMemo(() => {
    const cur = new Date(selectedDateStr + "T00:00:00");
    const days: Array<{
      dateStr: string;
      dayName: string;
      dayNum: number;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < 4; i++) {
      const d = new Date(cur);
      d.setDate(cur.getDate() + i);
      const str = formatDateStr(d.getFullYear(), d.getMonth(), d.getDate());
      days.push({
        dateStr: str,
        dayName: WEEKDAY_NAMES_7[d.getDay()],
        dayNum: d.getDate(),
        isToday: str === todayStr
      });
    }
    return days;
  }, [selectedDateStr, todayStr]);

  // Single Day Column for Day View
  const singleDayColumn = useMemo(() => {
    const cur = new Date(selectedDateStr + "T00:00:00");
    return [
      {
        dateStr: selectedDateStr,
        dayName: WEEKDAY_NAMES_7[cur.getDay()],
        dayNum: cur.getDate(),
        isToday: selectedDateStr === todayStr
      }
    ];
  }, [selectedDateStr, todayStr]);

  // Compute Year View: 12 months with days and density indicators
  const yearMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, mIdx) => {
      const daysCount = new Date(currentYear, mIdx + 1, 0).getDate();
      const firstDay = new Date(currentYear, mIdx, 1).getDay();
      const days = [];

      for (let i = 0; i < firstDay; i++) {
        days.push(null);
      }
      for (let d = 1; d <= daysCount; d++) {
        const dStr = formatDateStr(currentYear, mIdx, d);
        const count = (schedulesByDate.get(dStr) || []).length;
        days.push({
          dayNum: d,
          dateStr: dStr,
          isToday: dStr === todayStr,
          hasEvents: count > 0,
          count
        });
      }
      return {
        monthIndex: mIdx,
        monthName: MONTH_NAMES[mIdx],
        days
      };
    });
  }, [currentYear, schedulesByDate, todayStr]);

  // Compute Schedule / Agenda View
  const agendaList = useMemo(() => {
    const dates = Array.from(schedulesByDate.keys()).sort();
    return dates.map((dateStr) => {
      const items = schedulesByDate.get(dateStr) || [];
      const dObj = new Date(dateStr + "T00:00:00");
      const isPast = dateStr < todayStr;
      const isTodayDate = dateStr === todayStr;
      const label = isTodayDate
        ? "Today"
        : dObj.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric"
          });
      return {
        dateStr,
        label,
        isPast,
        isToday: isTodayDate,
        items
      };
    });
  }, [schedulesByDate, todayStr]);

  // Compute category counts for current view month
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      class: 0,
      test: 0,
      assignment: 0,
      project: 0,
      quiz: 0,
      holiday: 0,
      event: 0
    };
    for (const s of schedules) {
      if (!s.date) continue;
      const parts = s.date.split("-");
      if (
        parseInt(parts[0]) === currentYear &&
        parseInt(parts[1]) - 1 === currentMonth
      ) {
        if (counts[s.type] !== undefined) {
          counts[s.type]++;
        }
      }
    }
    return counts;
  }, [schedules, currentYear, currentMonth]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, item: any) => {
    setIsDraggingActive(true);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        id: item.id,
        date: item.date,
        isEvent: item.type === "holiday" || item.type === "event",
        source: "calendar"
      })
    );
  };

  const handleDragStartFromCurriculum = (
    e: React.DragEvent,
    topicItem: {
      title: string;
      type: "class" | "test" | "assignment" | "project" | "quiz";
      courseId: string;
      originalTitle: string;
    }
  ) => {
    setIsDraggingActive(true);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        ...topicItem,
        source: "curriculum"
      })
    );
  };

  const handleDragEnd = () => {
    setIsDraggingActive(false);
    setDragOverDate(null);
  };

  const handleDropOnDate = async (
    e: React.DragEvent,
    targetDateStr: string
  ) => {
    e.preventDefault();
    setDragOverDate(null);
    setIsDraggingActive(false);

    try {
      const rawData = e.dataTransfer.getData("application/json");
      if (!rawData) return;
      const data = JSON.parse(rawData);

      if (data.source === "curriculum") {
        const tempId = `temp-${Date.now()}`;
        const newSched = {
          id: tempId,
          course_id: data.courseId,
          batch: selectedBatch === "All Batches" ? null : selectedBatch,
          type: data.type,
          title: data.title,
          description: `Scheduled from Curriculum: ${data.originalTitle}`,
          date: targetDateStr,
          start_time: "10:00",
          end_time: "11:30"
        };

        setSchedules((prev) => [...prev, newSched]);

        const res = await createSchedule({
          course_id: data.courseId,
          batch: selectedBatch === "All Batches" ? undefined : selectedBatch,
          type: data.type,
          title: data.title,
          description: `Scheduled: ${data.originalTitle}`,
          date: targetDateStr,
          start_time: "10:00",
          end_time: "11:30"
        });

        if (!res.success) {
          setSchedules((prev) => prev.filter((s) => s.id !== tempId));
          alert(res.error || "Failed to schedule topic");
        } else {
          router.refresh();
        }
      } else if (data.source === "calendar") {
        if (data.date === targetDateStr) return;

        const previousSchedules = schedules;
        setSchedules((prev) =>
          prev.map((s) => (s.id === data.id ? { ...s, date: targetDateStr } : s))
        );

        const res = await updateScheduleDate({
          id: data.id,
          date: targetDateStr,
          isEvent: data.isEvent
        });

        if (!res.success) {
          setSchedules(previousSchedules);
          alert(res.error || "Failed to reschedule item");
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  // 1-Click Postpone (+1 Day)
  const handlePostponeItem = async (ev: any) => {
    if (!ev.date) return;
    const cur = new Date(ev.date + "T00:00:00");
    cur.setDate(cur.getDate() + 1);
    const nextDateStr = formatDateStr(
      cur.getFullYear(),
      cur.getMonth(),
      cur.getDate()
    );

    const prev = schedules;
    setSchedules((s) =>
      s.map((x) => (x.id === ev.id ? { ...x, date: nextDateStr } : x))
    );

    const res = await updateScheduleDate({
      id: ev.id,
      date: nextDateStr,
      isEvent: ev.type === "holiday" || ev.type === "event"
    });

    if (!res.success) {
      setSchedules(prev);
      alert(res.error || "Failed to postpone");
    } else {
      router.refresh();
    }
  };

  // 1-Click Duplicate (+1 Day)
  const handleDuplicateItem = async (ev: any) => {
    if (!ev.date) return;
    const cur = new Date(ev.date + "T00:00:00");
    cur.setDate(cur.getDate() + 1);
    const nextDateStr = formatDateStr(
      cur.getFullYear(),
      cur.getMonth(),
      cur.getDate()
    );

    const tempId = `temp-${Date.now()}`;
    setSchedules((s) => [...s, { ...ev, id: tempId, date: nextDateStr }]);

    const res = await duplicateSchedule(ev.id, nextDateStr);
    if (!res.success) {
      setSchedules((s) => s.filter((x) => x.id !== tempId));
      alert(res.error || "Failed to duplicate");
    } else {
      router.refresh();
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled item?")) return;
    const prev = schedules;
    setSchedules((s) => s.filter((x) => x.id !== id));
    const res = await deleteSchedule(id);
    if (res.error) {
      setSchedules(prev);
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  // Create form submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.title.trim()) return;
    setIsSubmitting(true);

    const res = await createSchedule({
      course_id: createFormData.course_id,
      batch:
        createFormData.batch === "All Batches"
          ? undefined
          : createFormData.batch,
      type: createFormData.type,
      title: createFormData.title,
      description: createFormData.description,
      date: createFormData.date,
      start_time: createFormData.start_time,
      end_time: createFormData.end_time
    });

    setIsSubmitting(false);
    if (res.success) {
      setShowCreateModal(false);
      setCreateFormData((prev) => ({
        ...prev,
        title: "",
        description: ""
      }));
      router.refresh();
    } else {
      alert(res.error || "Failed to create schedule");
    }
  };

  // Items for currently inspected date
  const inspectedItems = useMemo(() => {
    if (!inspectingDate) return [];
    return schedulesByDate.get(inspectingDate) || [];
  }, [inspectingDate, schedulesByDate]);

  // Check timing conflicts on inspected date
  const hasTimingConflict = useMemo(() => {
    if (inspectedItems.length <= 1) return false;
    for (let i = 0; i < inspectedItems.length; i++) {
      for (let j = i + 1; j < inspectedItems.length; j++) {
        const a = inspectedItems[i];
        const b = inspectedItems[j];
        if (a.start_time && a.end_time && b.start_time && b.end_time) {
          if (a.start_time < b.end_time && a.end_time > b.start_time) {
            return true;
          }
        }
      }
    }
    return false;
  }, [inspectedItems]);

  // Navigate inspected date with keyboard arrows
  const handleNavigateInspected = useCallback(
    (dir: -1 | 1) => {
      if (!inspectingDate) return;
      const cur = new Date(inspectingDate + "T00:00:00");
      cur.setDate(cur.getDate() + dir);
      setInspectingDate(
        formatDateStr(cur.getFullYear(), cur.getMonth(), cur.getDate())
      );
    },
    [inspectingDate]
  );

  useEffect(() => {
    if (!inspectingDate) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleNavigateInspected(-1);
      if (e.key === "ArrowRight") handleNavigateInspected(1);
      if (e.key === "Escape") setInspectingDate(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspectingDate, handleNavigateInspected]);

  // Inspected date formatted label
  const inspectingDateDisplay = useMemo(() => {
    if (!inspectingDate) return "";
    const d = new Date(inspectingDate + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }, [inspectingDate]);

  // Get current active view label
  const currentViewLabel = useMemo(() => {
    return VIEW_CONFIG.find((v) => v.key === viewMode)?.label || "Month";
  }, [viewMode]);

  // -------------------------------------------------------------
  // UNIFIED GOOGLE CALENDAR TIME-GRID (HOURLY MATRIX) RENDERER
  // Used for: Week View (7/5 cols), 4 Days View (4 cols), Day View (1 col)
  // -------------------------------------------------------------
  const renderTimeGrid = (
    columns: Array<{
      dateStr: string;
      dayName: string;
      dayNum: number;
      isToday: boolean;
    }>
  ) => {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
        {/* Sticky Top Header Row */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 shrink-0 shadow-2xs">
          {/* Top-Left Corner Box: Timezone Indicator (GMT+05:30 matching screenshot) */}
          <div className="w-14 sm:w-16 shrink-0 border-r border-slate-200 dark:border-slate-800 flex items-end justify-center pb-2 text-[10px] font-mono font-semibold text-slate-400 select-none">
            {timezoneLabel}
          </div>

          {/* Day Column Headers */}
          <div className="flex-1 flex divide-x divide-slate-200 dark:divide-slate-800">
            {columns.map((col) => (
              <div
                key={col.dateStr}
                onClick={() => setInspectingDate(col.dateStr)}
                className="flex-1 py-2 sm:py-3 text-center flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {col.dayName}
                </span>
                <span
                  className={`mt-0.5 text-base sm:text-xl font-medium transition ${
                    col.isToday
                      ? "w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white font-bold text-sm sm:text-base flex items-center justify-center mx-auto shadow-sm"
                      : "text-slate-800 dark:text-slate-100"
                  }`}
                >
                  {col.dayNum}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Hourly Time-Grid Body */}
        <div
          ref={timeGridScrollRef}
          className="flex-1 overflow-y-auto relative scroll-smooth"
        >
          <div className="relative flex min-h-[1440px] select-none">
            {/* Left Time Axis Column (12 AM to 11 PM) */}
            <div className="w-14 sm:w-16 shrink-0 border-r border-slate-200 dark:border-slate-800 relative bg-white dark:bg-slate-950 z-10 select-none">
              {HOURS_24.map((h) => (
                <div
                  key={h.hour24}
                  className="h-[60px] relative border-b border-transparent"
                >
                  {h.label && (
                    <span className="absolute right-2 -top-2.5 text-[10px] text-slate-400 font-medium select-none pointer-events-none">
                      {h.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day Columns Matrix */}
            <div className="flex-1 flex divide-x divide-slate-200 dark:divide-slate-800 relative">
              {columns.map((col) => {
                const daySchedules = schedulesByDate.get(col.dateStr) || [];
                const colMap = computeEventColumns(daySchedules);

                return (
                  <div key={col.dateStr} className="flex-1 relative min-w-0">
                    {/* 24 Hour Row Slots */}
                    {HOURS_24.map((h) => (
                      <div
                        key={h.hour24}
                        onClick={() => {
                          setCreateFormData((prev) => ({
                            ...prev,
                            date: col.dateStr,
                            start_time: `${String(h.hour24).padStart(2, "0")}:00`,
                            end_time: `${String(
                              Math.min(23, h.hour24 + 1)
                            ).padStart(2, "0")}:00`
                          }));
                          setShowCreateModal(true);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverDate(col.dateStr);
                        }}
                        onDragLeave={() => setDragOverDate(null)}
                        onDrop={(e) => handleDropOnDate(e, col.dateStr)}
                        className={`h-[60px] border-b border-slate-100 dark:border-slate-800/80 cursor-pointer transition-colors hover:bg-blue-50/20 dark:hover:bg-blue-900/10 ${
                          dragOverDate === col.dateStr
                            ? "bg-blue-50/50 dark:bg-blue-900/20"
                            : ""
                        }`}
                      />
                    ))}

                    {/* Google Calendar Current Time Red Line Indicator */}
                    {col.isToday && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${currentMinutes * 1}px` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0 shadow-sm" />
                        <div className="flex-1 h-[2px] bg-red-500" />
                      </div>
                    )}

                    {/* Event Blocks positioned by exact start & end time */}
                    {daySchedules.map((item) => {
                      const { top, height } = getEventStyle(item, 60);
                      const colInfo = colMap.get(item.id) || {
                        colIndex: 0,
                        totalCols: 1
                      };
                      const widthPct = 96 / colInfo.totalCols;
                      const leftPct = (colInfo.colIndex * 100) / colInfo.totalCols;
                      const cfg = getCatCfg(item.type);

                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart(e, item);
                          }}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingDate(col.dateStr);
                          }}
                          style={{
                            top,
                            height,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`
                          }}
                          className={`absolute z-10 rounded-lg p-1.5 sm:p-2 text-xs font-medium shadow-xs cursor-grab active:cursor-grabbing hover:shadow-md hover:z-20 transition-all overflow-hidden flex flex-col justify-between select-none ${cfg.bg}`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center justify-between text-[10px] opacity-90 leading-tight">
                              <span className="font-semibold">
                                {item.start_time} - {item.end_time}
                              </span>
                              <span className="capitalize hidden sm:inline">
                                {item.type}
                              </span>
                            </div>
                            <p className="font-bold text-xs truncate mt-0.5 leading-tight">
                              {item.title}
                            </p>
                            {item.batch && (
                              <span className="text-[10px] opacity-80 truncate block">
                                {item.batch}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[10px] opacity-75 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden select-none transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-none h-screen w-screen"
          : "h-full min-h-[640px]"
      }`}
    >
      {/* 1. TOP GOOGLE CALENDAR HEADER BAR */}
      <header className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
        {/* Left Section: Hamburger, Logo, Today, Chevrons, Month/Year */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title="Main menu (Toggle Sidebar)"
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>

          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 mr-1 sm:mr-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-semibold text-sm">
              <Calendar size={18} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-slate-800 dark:text-white tracking-tight leading-none">
                Calendar
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Vision LMS</p>
            </div>
          </div>

          {/* Today Button */}
          <button
            onClick={handleJumpToday}
            title="Jump to Today (Shortcut: T)"
            className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            Today
          </button>

          {/* Nav Chevrons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handlePrev}
              title="Previous"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              title="Next"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Current Period Heading */}
          <h2 className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 tracking-tight whitespace-nowrap">
            {viewMode === "year"
              ? `${currentYear}`
              : viewMode === "day"
              ? new Date(selectedDateStr + "T00:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" }
                )
              : `${MONTH_NAMES[currentMonth]} ${currentYear}`}
          </h2>
        </div>

        {/* Right Section: Search, Filters, Google View Dropdown & Mode Icons, Fullscreen */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-full border border-slate-200 dark:border-slate-700 text-xs w-44 focus-within:w-60 transition-all">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Course Selector */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <BookOpen size={13} className="text-slate-400 shrink-0" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none cursor-pointer border-none p-0 focus:ring-0 max-w-[120px] truncate"
            >
              <option
                value="all"
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                All Courses
              </option>
              {courses.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Selector */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Users size={13} className="text-slate-400 shrink-0" />
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none cursor-pointer border-none p-0 focus:ring-0 max-w-[110px] truncate"
            >
              {batches.map((b) => (
                <option
                  key={b}
                  value={b}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* EXACT GOOGLE CALENDAR VIEW SELECTOR PILL + DUAL MODE ICONS (MATCHING SCREENSHOT) */}
          <div className="relative" ref={viewDropdownRef}>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 p-0.5 shadow-2xs">
              {/* Dropdown Button */}
              <button
                onClick={() => setIsViewDropdownOpen((prev) => !prev)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>{currentViewLabel}</span>
                <ChevronDown
                  size={13}
                  className={`text-slate-500 transition-transform duration-200 ${
                    isViewDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Mode Icons [ 📅 ] and [ ✔️ ] */}
              <div className="flex items-center border-l border-slate-200 dark:border-slate-700 pl-1 ml-1 gap-0.5">
                <button
                  onClick={() => setIsTasksPanelOpen(false)}
                  title="Calendar mode"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    !isTasksPanelOpen
                      ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Calendar size={14} />
                </button>
                <button
                  onClick={() => setIsTasksPanelOpen((prev) => !prev)}
                  title="Tasks & Curriculum Checklist"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    isTasksPanelOpen
                      ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <CheckSquare size={14} />
                </button>
              </div>
            </div>

            {/* GOOGLE CALENDAR VIEW DROPDOWN MENU */}
            {isViewDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                {/* Views with single-key shortcuts */}
                <div className="space-y-0.5 px-1.5">
                  {VIEW_CONFIG.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => {
                        setViewMode(v.key);
                        setIsViewDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                        viewMode === v.key
                          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-normal"
                      }`}
                    >
                      <span>{v.label}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {v.shortcut}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Divider Line */}
                <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

                {/* Checkbox Preferences Toggles */}
                <div className="space-y-0.5 px-1.5">
                  {/* Show weekends */}
                  <button
                    onClick={() => setShowWeekends((prev) => !prev)}
                    className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  >
                    <span className="w-4 h-4 flex items-center justify-center text-blue-600 font-bold shrink-0">
                      {showWeekends && <Check size={14} strokeWidth={2.5} />}
                    </span>
                    <span>Show weekends</span>
                  </button>

                  {/* Show declined events */}
                  <button
                    onClick={() => setShowDeclinedEvents((prev) => !prev)}
                    className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  >
                    <span className="w-4 h-4 flex items-center justify-center text-blue-600 font-bold shrink-0">
                      {showDeclinedEvents && <Check size={14} strokeWidth={2.5} />}
                    </span>
                    <span>Show declined events</span>
                  </button>

                  {/* Show completed tasks */}
                  <button
                    onClick={() => setShowCompletedTasks((prev) => !prev)}
                    className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  >
                    <span className="w-4 h-4 flex items-center justify-center text-blue-600 font-bold shrink-0">
                      {showCompletedTasks && <Check size={14} strokeWidth={2.5} />}
                    </span>
                    <span>Show completed tasks</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Quick link to Academic Schedule */}
          <Link
            href="/admin/schedule"
            title="Curriculum Split View"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 transition"
          >
            <CalendarDays size={14} />
            <span className="hidden xl:inline">Curriculum View</span>
          </Link>
        </div>
      </header>

      {/* 2. BODY CONTENT: SIDEBAR + MAIN CALENDAR CANVAS + TASKS SLIDE-OVER */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* COLLAPSIBLE LEFT SIDEBAR */}
        <aside
          className={`shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-all duration-300 overflow-y-auto ${
            isSidebarOpen ? "w-64 p-4" : "w-0 p-0 border-none overflow-hidden"
          }`}
        >
          {isSidebarOpen && (
            <div className="space-y-6">
              {/* + Create Button */}
              <button
                onClick={() => {
                  setCreateFormData((prev) => ({
                    ...prev,
                    date: selectedDateStr || todayStr
                  }));
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center gap-3 px-5 py-3 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all cursor-pointer font-medium text-sm active:scale-98"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                  <Plus size={16} />
                </div>
                <span>Create Schedule</span>
              </button>

              {/* MINI MONTH DATE-PICKER CALENDAR */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {MONTH_NAMES[miniMonth]} {miniYear}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={handlePrevMini}
                      className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={handleNextMini}
                      className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Mini Weekday Headers */}
                <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400">
                  {MINI_WEEKDAY_NAMES.map((w, idx) => (
                    <span key={idx}>{w}</span>
                  ))}
                </div>

                {/* Mini Day Grid */}
                <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                  {miniCells.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedDateStr(c.dateStr);
                        setCurrentYear(miniYear);
                        setCurrentMonth(miniMonth);
                      }}
                      className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-[11px] font-medium transition cursor-pointer ${
                        c.isSelected
                          ? "bg-blue-600 text-white font-bold"
                          : c.isToday
                          ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold"
                          : c.isCurrentMonth
                          ? "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          : "text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {c.dayNum}
                    </button>
                  ))}
                </div>
              </div>

              {/* MY CALENDARS / LAYER CHECKBOX FILTERS */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Layers size={13} className="text-slate-400" /> Layer Filters
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {filteredSchedules.length} shown
                  </span>
                </div>

                <div className="space-y-1.5">
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                    const isChecked = layerFilters[key] !== false;
                    const count = categoryCounts[key] || 0;
                    return (
                      <label
                        key={key}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleLayer(key)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                          <span
                            className={`font-medium ${
                              isChecked
                                ? "text-slate-700 dark:text-slate-200"
                                : "text-slate-400 line-through"
                            }`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                          {count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* CURRICULUM TOPICS DRAWER (DRAGGABLE TO CALENDAR) */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => setCurriculumOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={13} className="text-slate-400" /> Drag Curriculum
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      curriculumOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {curriculumOpen && (
                  <div className="space-y-2 pt-1 text-xs">
                    <select
                      value={curriculumCourseId}
                      onChange={(e) => setCurriculumCourseId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs font-medium"
                    >
                      {courses.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          {c.title}
                        </option>
                      ))}
                    </select>

                    <p className="text-[10px] text-slate-400 leading-tight">
                      Drag any lesson or test below directly onto a calendar day:
                    </p>

                    {curriculumLoading ? (
                      <p className="text-slate-400 text-center py-2">Loading...</p>
                    ) : (
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                        {curriculumData.modules.flatMap((m) =>
                          (m.lessons || []).map((l: any) => (
                            <div
                              key={l.id}
                              draggable
                              onDragStart={(e) =>
                                handleDragStartFromCurriculum(e, {
                                  title: l.title,
                                  type: "class",
                                  courseId: curriculumCourseId,
                                  originalTitle: `${m.title} > ${l.title}`
                                })
                              }
                              onDragEnd={handleDragEnd}
                              className="p-1.5 rounded-md bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/30 hover:border-blue-400 cursor-grab active:cursor-grabbing text-[11px] font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 truncate"
                            >
                              <GripVertical size={11} className="text-slate-400 shrink-0" />
                              <BookOpen size={11} className="text-blue-500 shrink-0" />
                              <span className="truncate">{l.title}</span>
                            </div>
                          ))
                        )}
                        {curriculumData.tests.map((t) => (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={(e) =>
                              handleDragStartFromCurriculum(e, {
                                title: t.title,
                                type: "test",
                                courseId: curriculumCourseId,
                                originalTitle: t.title
                              })
                            }
                            onDragEnd={handleDragEnd}
                            className="p-1.5 rounded-md bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/30 hover:border-rose-400 cursor-grab active:cursor-grabbing text-[11px] font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 truncate"
                          >
                            <GripVertical size={11} className="text-slate-400 shrink-0" />
                            <FileText size={11} className="text-rose-500 shrink-0" />
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* MAIN CALENDAR GRID VIEW */}
        <main className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden relative">
          {/* A. MONTH VIEW */}
          {viewMode === "month" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Weekday Header Row */}
              <div
                className={`grid ${
                  showWeekends ? "grid-cols-7" : "grid-cols-5"
                } border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2 shrink-0`}
              >
                {(showWeekends ? WEEKDAY_NAMES_7 : WEEKDAY_NAMES_5).map(
                  (name) => (
                    <span key={name}>{name}</span>
                  )
                )}
              </div>

              {/* Month Day Grid */}
              <div
                className={`flex-1 grid ${
                  showWeekends ? "grid-cols-7" : "grid-cols-5"
                } auto-rows-fr overflow-y-auto`}
              >
                {monthCells.map((cell, idx) => {
                  const daySchedules = schedulesByDate.get(cell.dateStr) || [];
                  const isDragTarget = dragOverDate === cell.dateStr;

                  return (
                    <div
                      key={idx}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverDate(cell.dateStr);
                      }}
                      onDragLeave={() => setDragOverDate(null)}
                      onDrop={(e) => handleDropOnDate(e, cell.dateStr)}
                      onClick={() => setInspectingDate(cell.dateStr)}
                      className={`border-r border-b border-slate-200 dark:border-slate-800 p-1 sm:p-1.5 flex flex-col transition-all cursor-pointer select-none min-h-[90px] relative ${
                        cell.isCurrentMonth
                          ? "bg-white dark:bg-slate-950"
                          : "bg-slate-50/50 dark:bg-slate-900/20"
                      } ${
                        isDragTarget
                          ? "bg-blue-50/70 dark:bg-blue-900/30 ring-2 ring-blue-500 ring-inset"
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                      }`}
                    >
                      {/* Date Header: '1 Oct' on 1st of month, or '2', '3' */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-medium ${
                            cell.isToday
                              ? "w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs"
                              : cell.isCurrentMonth
                              ? "text-slate-800 dark:text-slate-200"
                              : "text-slate-400 dark:text-slate-600"
                          }`}
                        >
                          {cell.isFirstOfMonth
                            ? `${cell.dayNum} ${cell.monthLabel}`
                            : cell.dayNum}
                        </span>

                        {daySchedules.length > 0 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {daySchedules.length}
                          </span>
                        )}
                      </div>

                      {/* Event Chips (Max 3 visible, then +N more) */}
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {daySchedules.slice(0, 3).map((item) => {
                          const cfg = getCatCfg(item.type);
                          return (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                handleDragStart(e, item);
                              }}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingDate(cell.dateStr);
                              }}
                              title={`${item.title} (${item.start_time || ""} - ${
                                item.end_time || ""
                              })`}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1.5 shadow-2xs transition hover:brightness-95 cursor-grab active:cursor-grabbing ${cfg.bg}`}
                            >
                              <span className="text-[9px] opacity-80 shrink-0 font-normal">
                                {item.start_time ? item.start_time.slice(0, 5) : ""}
                              </span>
                              <span className="truncate">{item.title}</span>
                            </div>
                          );
                        })}

                        {daySchedules.length > 3 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingDate(cell.dateStr);
                            }}
                            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline px-1 py-0.5 mt-0.5 block transition cursor-pointer"
                          >
                            +{daySchedules.length - 3} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. WEEK VIEW (Google Calendar 24h Hourly Matrix) */}
          {viewMode === "week" && renderTimeGrid(weekDays)}

          {/* C. 4 DAYS VIEW (Google Calendar 24h Hourly Matrix) */}
          {viewMode === "4days" && renderTimeGrid(fourDays)}

          {/* D. DAY VIEW (Google Calendar 24h Hourly Matrix) */}
          {viewMode === "day" && renderTimeGrid(singleDayColumn)}

          {/* E. YEAR VIEW (12 Months Overview) */}
          {viewMode === "year" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Academic Year {currentYear}
                </h3>
                <span className="text-xs text-slate-400">
                  Click any date to inspect or switch view
                </span>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {yearMonths.map((ym) => (
                  <div
                    key={ym.monthIndex}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2"
                  >
                    <button
                      onClick={() => {
                        setCurrentMonth(ym.monthIndex);
                        setViewMode("month");
                      }}
                      className="text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 transition text-left cursor-pointer"
                    >
                      {ym.monthName}
                    </button>

                    {/* Weekday initials */}
                    <div className="grid grid-cols-7 text-center text-[9px] font-semibold text-slate-400">
                      {MINI_WEEKDAY_NAMES.map((w, i) => (
                        <span key={i}>{w}</span>
                      ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-y-1 text-center text-[10px]">
                      {ym.days.map((d, i) =>
                        d === null ? (
                          <span key={i} />
                        ) : (
                          <button
                            key={i}
                            onClick={() => {
                              setSelectedDateStr(d.dateStr);
                              setCurrentMonth(ym.monthIndex);
                              setInspectingDate(d.dateStr);
                            }}
                            className={`w-6 h-6 mx-auto rounded-full flex flex-col items-center justify-center transition cursor-pointer relative ${
                              d.isToday
                                ? "bg-blue-600 text-white font-bold"
                                : d.hasEvents
                                ? "font-bold text-slate-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            <span>{d.dayNum}</span>
                            {d.hasEvents && !d.isToday && (
                              <span className="w-1 h-1 rounded-full bg-blue-600 -mt-0.5" />
                            )}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* F. SCHEDULE / AGENDA VIEW */}
          {viewMode === "schedule" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Agenda Schedule
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chronological list of all lessons, tests, and events
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus size={14} /> New Schedule
                </button>
              </div>

              {agendaList.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <Calendar size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-medium">No events found</p>
                  <p className="text-xs text-slate-400">
                    Try adjusting your filters or create a new schedule item.
                  </p>
                </div>
              ) : (
                agendaList.map((ag) => (
                  <div key={ag.dateStr} className="space-y-2">
                    <div className="flex items-center gap-2 pt-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          ag.isToday
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {ag.label}
                      </span>
                      <div className="flex-1 h-px bg-slate-200 dark:border-slate-800" />
                    </div>

                    <div className="space-y-2">
                      {ag.items.map((item) => {
                        const cfg = getCatCfg(item.type);
                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-xl ${cfg.badgeBg} shrink-0`}>
                                {cfg.icon}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    {item.title}
                                  </h4>
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeBg}`}
                                  >
                                    {cfg.label}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                                  <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                                    <Clock size={12} /> {item.start_time} - {item.end_time}
                                  </span>
                                  {item.courses?.title && (
                                    <span className="flex items-center gap-1">
                                      <BookOpen size={12} /> {item.courses.title}
                                    </span>
                                  )}
                                  {item.batch && (
                                    <span className="flex items-center gap-1">
                                      <Users size={12} /> {item.batch}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              <button
                                onClick={() => handlePostponeItem(item)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium transition cursor-pointer"
                              >
                                +1d Postpone
                              </button>
                              <button
                                onClick={() => handleDuplicateItem(item)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs transition cursor-pointer"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-xs transition cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* GOOGLE TASKS SLIDE-OVER DRAWER (TRIGGERED BY [ ✔️ ] BUTTON) */}
        {isTasksPanelOpen && (
          <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 shadow-xl z-20 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <CheckSquare size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
                    Curriculum Tasks
                  </h4>
                  <p className="text-[10px] text-slate-400">Google Tasks Mode</p>
                </div>
              </div>
              <button
                onClick={() => setIsTasksPanelOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
              >
                <X size={15} />
              </button>
            </div>

            {/* Course Selector for Tasks */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
              <select
                value={curriculumCourseId}
                onChange={(e) => setCurriculumCourseId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                Check off lessons or drag them directly into any calendar day.
              </p>
            </div>

            {/* Task Checklist Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {curriculumLoading ? (
                <p className="text-center text-xs text-slate-400 py-6">
                  Loading tasks...
                </p>
              ) : (
                curriculumData.modules.flatMap((m) =>
                  (m.lessons || []).map((l: any) => {
                    const isDone = !!completedTaskIds[l.id];
                    return (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={(e) =>
                          handleDragStartFromCurriculum(e, {
                            title: l.title,
                            type: "class",
                            courseId: curriculumCourseId,
                            originalTitle: `${m.title} > ${l.title}`
                          })
                        }
                        onDragEnd={handleDragEnd}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2.5 transition cursor-grab active:cursor-grabbing ${
                          isDone
                            ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60"
                            : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 hover:border-blue-400 shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() =>
                              setCompletedTaskIds((prev) => ({
                                ...prev,
                                [l.id]: !prev[l.id]
                              }))
                            }
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                              isDone
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 dark:border-slate-600 hover:border-blue-500"
                            }`}
                          >
                            {isDone && <Check size={11} strokeWidth={3} />}
                          </button>
                          <span
                            className={`truncate ${
                              isDone
                                ? "line-through text-slate-400"
                                : "text-slate-800 dark:text-slate-100 font-medium"
                            }`}
                          >
                            {l.title}
                          </span>
                        </div>
                        <GripVertical size={13} className="text-slate-400 shrink-0" />
                      </div>
                    );
                  })
                )
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 3. DAY COMMAND CENTER MODAL (RICH INSPECTION) */}
      {inspectingDate && (
        <div
          onClick={() => setInspectingDate(null)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigateInspected(-1)}
                  title="Previous Day (←)"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {inspectingDateDisplay}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Use ← / → arrows to navigate • ESC to close
                  </p>
                </div>
                <button
                  onClick={() => handleNavigateInspected(1)}
                  title="Next Day (→)"
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCreateFormData((prev) => ({
                      ...prev,
                      date: inspectingDate
                    }));
                    setShowCreateModal(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus size={13} /> Add Item
                </button>
                <button
                  onClick={() => setInspectingDate(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Timing Conflict Warning Banner */}
            {hasTimingConflict && (
              <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Timing Conflict Detected:</strong> Two or more scheduled items
                  overlap in time on this date.
                </span>
              </div>
            )}

            {/* Modal Body: List of Items for Inspected Date */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {inspectedItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Calendar size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-medium">No schedules on this date</p>
                  <p className="text-xs text-slate-400">
                    Click &ldquo;Add Item&rdquo; above to schedule a lesson, exam, or event.
                  </p>
                </div>
              ) : (
                inspectedItems.map((item) => {
                  const cfg = getCatCfg(item.type);
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className={`w-3 h-3 rounded-full ${cfg.dot} mt-1 shrink-0`} />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {item.title}
                              </h4>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeBg}`}
                              >
                                {cfg.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                              <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                                <Clock size={12} /> {item.start_time} - {item.end_time}
                              </span>
                              {item.courses?.title && (
                                <span className="flex items-center gap-1">
                                  <BookOpen size={12} /> {item.courses.title}
                                </span>
                              )}
                              {item.batch && (
                                <span className="flex items-center gap-1">
                                  <Users size={12} /> {item.batch}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Attendance Link for Live Class */}
                        {item.type === "class" && (
                          <Link
                            href={`/admin/lms/attendance?date=${item.date}`}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 rounded-md text-[11px] font-medium flex items-center gap-1 transition"
                          >
                            <CheckCircle2 size={12} /> Attendance
                          </Link>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg">
                          {item.description}
                        </p>
                      )}

                      {/* Item Action Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePostponeItem(item)}
                            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer flex items-center gap-1"
                          >
                            <span>+1d Postpone</span>
                          </button>
                          <button
                            onClick={() => handleDuplicateItem(item)}
                            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer flex items-center gap-1"
                          >
                            <Copy size={12} /> Duplicate
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-2.5 py-1 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium transition cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CREATE NEW SCHEDULE MODAL */}
      {showCreateModal && (
        <div
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={16} className="text-blue-600" /> New Schedule Entry
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* Type Selector */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Object.entries(CATEGORY_CONFIG).map(([typeKey, cfg]) => (
                    <button
                      type="button"
                      key={typeKey}
                      onClick={() =>
                        setCreateFormData((prev) => ({ ...prev, type: typeKey as any }))
                      }
                      className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                        createFormData.type === typeKey
                          ? `${cfg.badgeBg} border-blue-500 ring-2 ring-blue-500/20`
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {cfg.icon}
                      <span className="truncate">{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: React State Management"
                  value={createFormData.title}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                />
              </div>

              {/* Course & Batch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Course
                  </label>
                  <select
                    value={createFormData.course_id}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        course_id: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    {courses.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Batch
                  </label>
                  <select
                    value={createFormData.batch}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        batch: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none"
                  >
                    {batches.map((b) => (
                      <option
                        key={b}
                        value={b}
                        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={createFormData.date}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={createFormData.start_time}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        start_time: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={createFormData.end_time}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        end_time: e.target.value
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Description / Agenda (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Details, meeting links, or student instructions..."
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({
                      ...prev,
                      description: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 outline-none resize-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Creating..." : "Schedule Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { GoogleCalendarClient };
