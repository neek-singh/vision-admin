"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  BookOpen, 
  HelpCircle, 
  TrendingUp, 
  Download, 
  Calendar, 
  ChevronDown, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Zap,
  RotateCcw,
  Sparkles,
  GraduationCap
} from "lucide-react";

interface ProgressRecord {
  id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  courseName: string;
  courseCode: string;
  progress: number; // Lesson mastery %
  completedLessons: number;
  totalLessons: number;
  activeSeconds: number;
  studyTimeProgress: number; // Study time target progress %
  quizzesDone: number;
  totalQuizzes: number;
  quizProgress: number; // Quiz completion %
  lastActive: string | null;
  status: string;
}

interface ProgressTableProps {
  initialRecords: ProgressRecord[];
  availableCourses: { id: string; title: string; course_code: string }[];
  stats: {
    totalCompleted: number;
    activeNowCount: number;
    atRiskCount: number;
  };
}

export default function ProgressTable({ initialRecords, availableCourses, stats }: ProgressTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  // Sorting states
  const [sortBy, setSortBy] = useState<"mastery" | "studyTime" | "quiz" | "lastActive">("mastery");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const itemsPerPage = 10;

  // Filter & Search logic
  const filteredRecords = useMemo(() => {
    return initialRecords.filter((record) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = 
        !q ||
        record.name.toLowerCase().includes(q) ||
        record.studentId.toLowerCase().includes(q) ||
        record.email.toLowerCase().includes(q);

      const matchesCourse = 
        selectedCourse === "all" || 
        record.courseName === selectedCourse;

      const matchesStatus = 
        selectedStatus === "all" || 
        record.status === selectedStatus;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [initialRecords, searchTerm, selectedCourse, selectedStatus]);

  // Sort logic
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortBy === "mastery") {
        valA = a.progress;
        valB = b.progress;
      } else if (sortBy === "studyTime") {
        valA = a.activeSeconds;
        valB = b.activeSeconds;
      } else if (sortBy === "quiz") {
        valA = a.quizProgress;
        valB = b.quizProgress;
      } else if (sortBy === "lastActive") {
        valA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        valB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      }

      if (valA === valB) {
        return a.name.localeCompare(b.name);
      }

      return sortOrder === "desc" ? valB - valA : valA - valB;
    });
  }, [filteredRecords, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    return sortedRecords.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedRecords, currentPage, itemsPerPage]);

  const hasActiveFilters = searchTerm !== "" || selectedCourse !== "all" || selectedStatus !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCourse("all");
    setSelectedStatus("all");
    setCurrentPage(1);
  };

  // Sorting Handler
  const toggleSort = (field: "mastery" | "studyTime" | "quiz" | "lastActive") => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc"); // Default to highest first
    }
    setCurrentPage(1);
  };

  // Helper for Initials
  const getInitials = (name: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Time Formatter
  const formatActiveTime = (totalSecs: number) => {
    if (!totalSecs) return "0m active";
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m active`;
    return `${mins}m active`;
  };

  // Last Active Formatter & Recency
  const getLastActiveInfo = (dateString: string | null) => {
    if (!dateString) {
      return { text: "Never", tone: "inactive" as const };
    }
    const date = new Date(dateString);
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return { text: "Just now", tone: "recent" as const };
    if (diffMins < 60) return { text: `${diffMins}m ago`, tone: "recent" as const };
    if (diffHrs < 24) return { text: `${diffHrs}h ago`, tone: "recent" as const };
    if (diffDays === 1) return { text: "Yesterday", tone: "recent" as const };
    if (diffDays <= 7) return { text: `${diffDays}d ago`, tone: "moderate" as const };
    return { text: `${diffDays}d ago`, tone: "inactive" as const };
  };

  // CSV Exporter
  const exportToCSV = () => {
    const headers = [
      "Student ID", "Name", "Email", "Phone", "Course", 
      "Lesson Mastery %", "Lessons Done", "Total Lessons", 
      "Study Time Target %", "Active Study Time", 
      "Quiz Progress %", "Quizzes Done", "Total Quizzes", 
      "Last Active", "Status"
    ];
    const rows = sortedRecords.map(r => [
      r.studentId,
      r.name,
      r.email,
      r.phone,
      r.courseName,
      `${r.progress}%`,
      r.completedLessons,
      r.totalLessons,
      `${r.studyTimeProgress}%`,
      formatActiveTime(r.activeSeconds),
      `${r.quizProgress}%`,
      r.quizzesDone,
      r.totalQuizzes,
      getLastActiveInfo(r.lastActive).text,
      r.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LMS_Progress_Leaderboard_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortHeader = (label: string, field: "mastery" | "studyTime" | "quiz" | "lastActive", className?: string) => {
    const isSorted = sortBy === field;
    return (
      <th 
        onClick={() => toggleSort(field)}
        className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/50 select-none group transition-colors ${className || ""}`}
      >
        <div className="flex items-center gap-1.5">
          <span className={isSorted ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-600 dark:text-slate-400"}>
            {label}
          </span>
          {isSorted ? (
            sortOrder === "desc" ? (
              <ArrowDown size={13} className="text-blue-600 dark:text-blue-400" />
            ) : (
              <ArrowUp size={13} className="text-blue-600 dark:text-blue-400" />
            )
          ) : (
            <ArrowUpDown size={12} className="text-slate-350 dark:text-slate-600 opacity-40 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </th>
    );
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case "Slow Progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Slow Progress
          </span>
        );
      case "At Risk":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            At Risk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            On Track
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Student Progress Leaderboard
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {initialRecords.length} Enrollments
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sort and monitor lesson mastery, active study time, and quiz milestones.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Download size={14} className="text-slate-500 dark:text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary - Clean Minimal Cards (No chunky saturated backgrounds) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Completed Course Enrollments */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Completed Enrollments
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.totalCompleted}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              100% finished
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-normal">
            Enrolled students completed all lessons
          </p>
        </div>

        {/* Recently Active Learners */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-blue-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recently Active
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
              <Zap size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.activeNowCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-normal">
            Engaged in LMS within last 48 hours
          </p>
        </div>

        {/* At Risk Students */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-rose-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              At Risk Students
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 group-hover:scale-105 transition-transform">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.atRiskCount}
            </span>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              Needs follow-up
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-normal">
            No activity for 7 or more days
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 overflow-hidden transition-colors">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
              Leaderboard Ranking
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              ({sortedRecords.length} {sortedRecords.length === 1 ? "record" : "records"})
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search student or ID..." 
                className="pl-8.5 pr-8 py-1.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-xs rounded-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 w-full transition-all dark:text-white placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Course Filter */}
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-8 py-1.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-xs rounded-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 cursor-pointer transition-all dark:text-slate-300 w-full sm:w-44 truncate"
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Courses</option>
                {availableCourses.map((course) => (
                  <option key={course.id} value={course.title}>
                    {course.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                className="appearance-none pl-3 pr-8 py-1.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-xs rounded-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 cursor-pointer transition-all dark:text-slate-300 w-full sm:w-36"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="On Track">On Track</option>
                <option value="Slow Progress">Slow Progress</option>
                <option value="At Risk">At Risk</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
            </div>

            {/* Reset Filters Pill */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}

            {/* Mobile Sort Dropdown */}
            <div className="relative md:hidden w-full">
              <select
                className="appearance-none pl-3 pr-8 py-1.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-xs rounded-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 cursor-pointer transition-all w-full dark:text-slate-300"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-") as [any, any];
                  setSortBy(field);
                  setSortOrder(order);
                  setCurrentPage(1);
                }}
              >
                <option value="mastery-desc">Sort: Mastery (High → Low)</option>
                <option value="mastery-asc">Sort: Mastery (Low → High)</option>
                <option value="studyTime-desc">Sort: Study Time (High → Low)</option>
                <option value="studyTime-asc">Sort: Study Time (Low → High)</option>
                <option value="quiz-desc">Sort: Quizzes (High → Low)</option>
                <option value="quiz-asc">Sort: Quizzes (Low → High)</option>
                <option value="lastActive-desc">Sort: Last Active (Recent)</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider w-64">
                  Student Info
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider w-60">
                  Course
                </th>
                {renderSortHeader("Lesson Mastery", "mastery")}
                {renderSortHeader("Study Time", "studyTime")}
                {renderSortHeader("Quiz Progress", "quiz")}
                {renderSortHeader("Last Active", "lastActive")}
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-right w-12">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                        <Search size={18} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        No student records found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Try adjusting your search keywords, selected course, or active status filters.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="mt-3.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => {
                  const activeInfo = getLastActiveInfo(record.lastActive);
                  return (
                    <tr 
                      key={record.id} 
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Student Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(record.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                              {record.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-medium">
                                {record.studentId}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                                {record.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-5 py-3.5">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate max-w-[210px]" title={record.courseName}>
                            {record.courseName}
                          </p>
                          <span className="inline-block text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                            {record.courseCode}
                          </span>
                        </div>
                      </td>
                      
                      {/* Mastery Progress Column */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1.5 w-32">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {record.progress}%
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                              {record.completedLessons}/{record.totalLessons}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                record.progress === 100 
                                  ? 'bg-emerald-500' 
                                  : 'bg-blue-600 dark:bg-blue-500'
                              }`} 
                              style={{ width: `${record.progress}%` }} 
                            />
                          </div>
                        </div>
                      </td>

                      {/* Study Time Progress Column */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1.5 w-32">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {record.studyTimeProgress}%
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                              {formatActiveTime(record.activeSeconds)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                record.studyTimeProgress >= 100 
                                  ? 'bg-emerald-500' 
                                  : 'bg-indigo-600 dark:bg-indigo-500'
                              }`} 
                              style={{ width: `${record.studyTimeProgress}%` }} 
                            />
                          </div>
                        </div>
                      </td>

                      {/* Quiz Progress Column */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1.5 w-32">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {record.quizProgress}%
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                              {record.quizzesDone}/{record.totalQuizzes} done
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                record.totalQuizzes === 0 
                                  ? 'bg-slate-200 dark:bg-slate-700' 
                                  : record.quizProgress === 100 
                                  ? 'bg-emerald-500' 
                                  : 'bg-violet-600 dark:bg-violet-500'
                              }`} 
                              style={{ width: `${record.totalQuizzes === 0 ? 0 : record.quizProgress}%` }} 
                            />
                          </div>
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            activeInfo.tone === "recent" 
                              ? "bg-emerald-500" 
                              : activeInfo.tone === "moderate" 
                              ? "bg-amber-500" 
                              : "bg-slate-350 dark:bg-slate-600"
                          }`} />
                          <span className="text-[11px] font-medium">{activeInfo.text}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-3.5">
                        {renderStatusBadge(record.status)}
                      </td>
                      
                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <a 
                          href={`/admin/students?query=${encodeURIComponent(record.name)}`}
                          className="inline-flex p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          title="View student profile"
                        >
                          <ArrowUpRight size={15} />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Medium and Mobile Stack View */}
        <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {paginatedRecords.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No student records found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Adjust your filters or search keywords.
              </p>
            </div>
          ) : (
            paginatedRecords.map((record) => {
              const activeInfo = getLastActiveInfo(record.lastActive);
              return (
                <div key={record.id} className="p-4 space-y-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(record.name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-xs">
                          {record.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-medium">
                            {record.studentId}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {record.email}
                          </span>
                        </div>
                      </div>
                    </div>
                    {renderStatusBadge(record.status)}
                  </div>

                  {/* Course tag */}
                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 font-medium text-[11px] truncate max-w-[200px]">
                      {record.courseName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {record.courseCode}
                    </span>
                  </div>

                  {/* Progress Meters */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    {/* Mastery */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 font-medium">Mastery</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{record.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full" 
                          style={{ width: `${record.progress}%` }} 
                        />
                      </div>
                    </div>

                    {/* Study Time */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 font-medium">Target</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{record.studyTimeProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full" 
                          style={{ width: `${record.studyTimeProgress}%` }} 
                        />
                      </div>
                    </div>

                    {/* Quizzes */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400 font-medium">Quizzes</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{record.quizProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-violet-600 dark:bg-violet-500 rounded-full" 
                          style={{ width: `${record.quizProgress}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer with activity and link */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={11} />
                      <span>{activeInfo.text}</span>
                    </div>
                    <a 
                      href={`/admin/students?query=${encodeURIComponent(record.name)}`}
                      className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Profile</span>
                      <ArrowUpRight size={12} />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, sortedRecords.length)}</span> of <span className="font-semibold text-slate-700 dark:text-slate-300">{sortedRecords.length}</span> enrollments
            </p>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" 
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="text-xs text-slate-400 px-2 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2.5 py-1 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" 
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
