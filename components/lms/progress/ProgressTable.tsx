"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp, 
  Download, 
  ChevronDown, 
  X,
  Zap,
  RotateCcw,
  ArrowUpRight,
  BookOpen,
  HelpCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter
} from "lucide-react";

interface ProgressRecord {
  id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  courseName: string;
  courseCode: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  activeSeconds: number;
  studyTimeProgress: number;
  quizzesDone: number;
  totalQuizzes: number;
  quizProgress: number;
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
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"mastery" | "studyTime" | "quiz" | "lastActive">("mastery");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const itemsPerPage = 10;

  const filteredRecords = useMemo(() => {
    return initialRecords.filter((record) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = 
        !q ||
        record.name.toLowerCase().includes(q) ||
        record.studentId.toLowerCase().includes(q) ||
        record.email.toLowerCase().includes(q);
      const matchesCourse = selectedCourse === "all" || record.courseName === selectedCourse;
      const matchesStatus = selectedStatus === "all" || record.status === selectedStatus;
      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [initialRecords, searchTerm, selectedCourse, selectedStatus]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let valA = 0, valB = 0;
      if (sortBy === "mastery") { valA = a.progress; valB = b.progress; }
      else if (sortBy === "studyTime") { valA = a.activeSeconds; valB = b.activeSeconds; }
      else if (sortBy === "quiz") { valA = a.quizProgress; valB = b.quizProgress; }
      else if (sortBy === "lastActive") {
        valA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        valB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      }
      if (valA === valB) return a.name.localeCompare(b.name);
      return sortOrder === "desc" ? valB - valA : valA - valB;
    });
  }, [filteredRecords, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    return sortedRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedRecords, currentPage]);

  const hasActiveFilters = searchTerm !== "" || selectedCourse !== "all" || selectedStatus !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCourse("all");
    setSelectedStatus("all");
    setCurrentPage(1);
  };

  const toggleSort = (field: "mastery" | "studyTime" | "quiz" | "lastActive") => {
    if (sortBy === field) setSortOrder(prev => prev === "desc" ? "asc" : "desc");
    else { setSortBy(field); setSortOrder("desc"); }
    setCurrentPage(1);
  };

  const getInitials = (name: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatActiveTime = (totalSecs: number) => {
    if (!totalSecs) return "0m";
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getLastActiveInfo = (dateString: string | null) => {
    if (!dateString) return { text: "Never", tone: "inactive" as const };
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

  const exportToCSV = () => {
    const headers = ["Student ID","Name","Email","Phone","Course","Lesson Mastery %","Lessons Done","Total Lessons","Study Time Target %","Active Study Time","Quiz Progress %","Quizzes Done","Total Quizzes","Last Active","Status"];
    const rows = sortedRecords.map(r => [
      r.studentId, r.name, r.email, r.phone, r.courseName,
      `${r.progress}%`, r.completedLessons, r.totalLessons,
      `${r.studyTimeProgress}%`, formatActiveTime(r.activeSeconds),
      `${r.quizProgress}%`, r.quizzesDone, r.totalQuizzes,
      getLastActiveInfo(r.lastActive).text, r.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `LMS_Progress_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortIcon = (field: "mastery" | "studyTime" | "quiz" | "lastActive") => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="opacity-40 group-hover:opacity-100" />;
    return sortOrder === "desc" ? <ArrowDown size={12} className="text-blue-600" /> : <ArrowUp size={12} className="text-blue-600" />;
  };

  const renderStatusBadge = (status: string) => {
    const configs: Record<string, { dot: string; text: string; bg: string }> = {
      Completed: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
      "On Track": { dot: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
      "Slow Progress": { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
      "At Risk": { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
    };
    const cfg = configs[status] || configs["On Track"];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            Student Progress
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {initialRecords.length} enrollments tracked
          </p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all shrink-0"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Stats — 3 cards, 2-col on mobile */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalCompleted}</p>
          <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5">100% lessons done</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Zap size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.activeNowCount}</p>
            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[11px] font-medium text-blue-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              live
            </span>
          </div>
          <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5">Last 48 hours</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">At Risk</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertCircle size={14} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.atRiskCount}</p>
          <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5">7+ days inactive</p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Controls */}
        <div className="p-3 sm:p-4 border-b border-slate-100 space-y-2.5">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input 
                type="text" 
                placeholder="Search student, ID..." 
                className="pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl outline-none focus:bg-white focus:border-blue-500 w-full transition-all"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter toggle on mobile */}
            <button
              onClick={() => setShowFilters(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all shrink-0 sm:hidden ${showFilters || hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
            >
              <Filter size={13} />
              Filters {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>

            {/* Filters inline on desktop */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <div className="relative">
                <select
                  className="appearance-none pl-3 pr-7 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl outline-none focus:border-blue-500 cursor-pointer w-44 truncate"
                  value={selectedCourse}
                  onChange={(e) => { setSelectedCourse(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">All Courses</option>
                  {availableCourses.map((course) => (
                    <option key={course.id} value={course.title}>{course.title}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
              <div className="relative">
                <select
                  className="appearance-none pl-3 pr-7 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl outline-none focus:border-blue-500 cursor-pointer w-32"
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">All Status</option>
                  <option value="Completed">Completed</option>
                  <option value="On Track">On Track</option>
                  <option value="Slow Progress">Slow Progress</option>
                  <option value="At Risk">At Risk</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                  <RotateCcw size={11} /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Mobile expanded filters */}
          {showFilters && (
            <div className="flex flex-col gap-2 sm:hidden">
              <div className="relative">
                <select
                  className="appearance-none pl-3 pr-7 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl outline-none w-full"
                  value={selectedCourse}
                  onChange={(e) => { setSelectedCourse(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">All Courses</option>
                  {availableCourses.map((course) => (
                    <option key={course.id} value={course.title}>{course.title}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
              <div className="relative">
                <select
                  className="appearance-none pl-3 pr-7 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl outline-none w-full"
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">All Status</option>
                  <option value="Completed">Completed</option>
                  <option value="On Track">On Track</option>
                  <option value="Slow Progress">Slow Progress</option>
                  <option value="At Risk">At Risk</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
              {/* Mobile Sort */}
              <div className="relative">
                <select
                  className="appearance-none pl-3 pr-7 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl outline-none w-full"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-") as [any, any];
                    setSortBy(field); setSortOrder(order); setCurrentPage(1);
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
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center justify-center gap-1 py-2 text-xs font-medium text-rose-600 bg-rose-50 rounded-xl border border-rose-100">
                  <RotateCcw size={11} /> Clear Filters
                </button>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-400 font-medium">
            {sortedRecords.length} {sortedRecords.length === 1 ? "record" : "records"} found
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5 w-64">Student</th>
                <th className="px-5 py-3.5 w-52">Course</th>
                <th className="px-5 py-3.5 cursor-pointer hover:bg-slate-100 group select-none" onClick={() => toggleSort("mastery")}>
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={12} className="text-blue-500" />
                    <span className={sortBy === "mastery" ? "text-blue-600 font-bold" : ""}>Mastery</span>
                    {renderSortIcon("mastery")}
                  </div>
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:bg-slate-100 group select-none" onClick={() => toggleSort("studyTime")}>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-indigo-500" />
                    <span className={sortBy === "studyTime" ? "text-blue-600 font-bold" : ""}>Study Time</span>
                    {renderSortIcon("studyTime")}
                  </div>
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:bg-slate-100 group select-none" onClick={() => toggleSort("quiz")}>
                  <div className="flex items-center gap-1.5">
                    <HelpCircle size={12} className="text-violet-500" />
                    <span className={sortBy === "quiz" ? "text-blue-600 font-bold" : ""}>Quizzes</span>
                    {renderSortIcon("quiz")}
                  </div>
                </th>
                <th className="px-5 py-3.5 cursor-pointer hover:bg-slate-100 group select-none" onClick={() => toggleSort("lastActive")}>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-emerald-500" />
                    <span className={sortBy === "lastActive" ? "text-blue-600 font-bold" : ""}>Last Active</span>
                    {renderSortIcon("lastActive")}
                  </div>
                </th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 w-12 text-right"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                        <Search size={18} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No records found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters.</p>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="mt-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Clear filters</button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => {
                  const activeInfo = getLastActiveInfo(record.lastActive);
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 border border-blue-200/50 font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(record.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-xs truncate">{record.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">{record.studentId}</span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[130px]">{record.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800 text-xs truncate max-w-[200px]">{record.courseName}</p>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{record.courseCode}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1 w-28">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">{record.progress}%</span>
                            <span className="text-slate-400 text-[10px]">{record.completedLessons}/{record.totalLessons}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${record.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${record.progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1 w-28">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">{record.studyTimeProgress}%</span>
                            <span className="text-slate-400 text-[10px]">{formatActiveTime(record.activeSeconds)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${record.studyTimeProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${record.studyTimeProgress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-1 w-28">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">{record.quizProgress}%</span>
                            <span className="text-slate-400 text-[10px]">{record.quizzesDone}/{record.totalQuizzes}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${record.totalQuizzes === 0 ? 'bg-slate-200' : record.quizProgress === 100 ? 'bg-emerald-500' : 'bg-violet-600'}`} style={{ width: `${record.totalQuizzes === 0 ? 0 : record.quizProgress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${activeInfo.tone === "recent" ? "bg-emerald-500" : activeInfo.tone === "moderate" ? "bg-amber-500" : "bg-slate-300"}`} />
                          <span className="text-[11px] font-medium text-slate-600">{activeInfo.text}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{renderStatusBadge(record.status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <a href={`/students?query=${encodeURIComponent(record.name)}`} className="inline-flex p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <ArrowUpRight size={14} />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="lg:hidden divide-y divide-slate-100">
          {paginatedRecords.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">No records found</p>
              <p className="text-xs text-slate-400 mt-1">Adjust your filters.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 text-xs text-blue-600 font-medium">Clear filters</button>
              )}
            </div>
          ) : (
            paginatedRecords.map((record) => {
              const activeInfo = getLastActiveInfo(record.lastActive);
              return (
                <div key={record.id} className="p-4 space-y-3">
                  {/* Student row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 border border-blue-200/50 font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(record.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm leading-tight truncate">{record.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">{record.studentId}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {renderStatusBadge(record.status)}
                      <a href={`/students?query=${encodeURIComponent(record.name)}`} className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5">
                        Profile <ArrowUpRight size={10} />
                      </a>
                    </div>
                  </div>

                  {/* Course chip */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[180px]">{record.courseName}</span>
                    <span className="text-[9px] font-mono text-slate-400 uppercase shrink-0 ml-2">{record.courseCode}</span>
                  </div>

                  {/* 3 progress meters */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Mastery */}
                    <div className="bg-blue-50 rounded-xl p-2.5 border border-blue-100">
                      <div className="flex items-center gap-1 mb-1">
                        <BookOpen size={9} className="text-blue-500" />
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wide">Mastery</span>
                      </div>
                      <p className="text-lg font-black text-blue-700 leading-none">{record.progress}%</p>
                      <p className="text-[9px] text-blue-500 mt-1">{record.completedLessons}/{record.totalLessons} lessons</p>
                      <div className="w-full h-1 bg-blue-100 rounded-full mt-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${record.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${record.progress}%` }} />
                      </div>
                    </div>

                    {/* Study Time */}
                    <div className="bg-indigo-50 rounded-xl p-2.5 border border-indigo-100">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock size={9} className="text-indigo-500" />
                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide">Time</span>
                      </div>
                      <p className="text-lg font-black text-indigo-700 leading-none">{record.studyTimeProgress}%</p>
                      <p className="text-[9px] text-indigo-500 mt-1">{formatActiveTime(record.activeSeconds)}</p>
                      <div className="w-full h-1 bg-indigo-100 rounded-full mt-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${record.studyTimeProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${record.studyTimeProgress}%` }} />
                      </div>
                    </div>

                    {/* Quizzes */}
                    <div className="bg-violet-50 rounded-xl p-2.5 border border-violet-100">
                      <div className="flex items-center gap-1 mb-1">
                        <HelpCircle size={9} className="text-violet-500" />
                        <span className="text-[9px] font-bold text-violet-600 uppercase tracking-wide">Quizzes</span>
                      </div>
                      <p className="text-lg font-black text-violet-700 leading-none">{record.quizProgress}%</p>
                      <p className="text-[9px] text-violet-500 mt-1">{record.quizzesDone}/{record.totalQuizzes} done</p>
                      <div className="w-full h-1 bg-violet-100 rounded-full mt-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${record.quizProgress === 100 ? 'bg-emerald-500' : 'bg-violet-600'}`} style={{ width: `${record.totalQuizzes === 0 ? 0 : record.quizProgress}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
                    <Clock size={10} />
                    <span className={`font-medium ${activeInfo.tone === "recent" ? "text-emerald-600" : activeInfo.tone === "moderate" ? "text-amber-600" : "text-slate-400"}`}>
                      {activeInfo.text}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, sortedRecords.length)}</span> of <span className="font-semibold text-slate-700">{sortedRecords.length}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" 
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="text-xs text-slate-400 px-2 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" 
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
