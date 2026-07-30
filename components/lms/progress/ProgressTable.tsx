"use client";

import { useState } from "react";
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
  ArrowUpDown
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
  const filteredRecords = initialRecords.filter((record) => {
    const matchesSearch = 
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCourse = 
      selectedCourse === "all" || 
      record.courseName === selectedCourse;

    const matchesStatus = 
      selectedStatus === "all" || 
      record.status === selectedStatus;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  // Sort logic
  const sortedRecords = [...filteredRecords].sort((a, b) => {
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

  // Pagination logic
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const paginatedRecords = sortedRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  // Time Formatter
  const formatActiveTime = (totalSecs: number) => {
    if (!totalSecs) return "0m active";
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m active`;
    return `${mins}m active`;
  };

  // Last Active Formatter
  const formatLastActive = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
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
      formatLastActive(r.lastActive),
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

  const renderSortHeader = (label: string, field: "mastery" | "studyTime" | "quiz" | "lastActive") => {
    const isSorted = sortBy === field;
    return (
      <th 
        onClick={() => toggleSort(field)}
        className="px-6 py-4 font-black text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40 select-none group transition-all"
      >
        <div className="flex items-center gap-1.5 justify-start">
          <span>{label}</span>
          <ArrowUpDown size={12} className={`transition-all ${isSorted ? "text-blue-600 dark:text-blue-400 opacity-100" : "text-slate-400 dark:text-slate-650 opacity-40 group-hover:opacity-100"}`} />
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Student Progress Leaderboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sort and monitor lesson mastery, active study time, and quiz milestones.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-black rounded-xl shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
          >
             <Download size={16} /> Export Leaderboard
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 transition-colors duration-300">
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-450 uppercase tracking-widest mb-1">Completed Course Enrollments</p>
            <p className="text-4xl font-black text-emerald-700 dark:text-emerald-400">{stats.totalCompleted}</p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 font-bold mt-2">Enrolled students finished all modules</p>
        </div>
        <div className="bg-blue-50/70 dark:bg-blue-950/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 transition-colors duration-300">
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-450 uppercase tracking-widest mb-1">Recently Active Learners</p>
            <p className="text-4xl font-black text-blue-700 dark:text-blue-400">{stats.activeNowCount}</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-500/70 font-bold mt-2">Active in the last 48 hours</p>
        </div>
        <div className="bg-rose-50/70 dark:bg-rose-950/20 p-6 rounded-2xl border border-rose-100 dark:border-rose-900/30 transition-colors duration-300">
            <p className="text-[10px] font-black text-rose-600 dark:text-rose-455 uppercase tracking-widest mb-1">At Risk Students</p>
            <p className="text-4xl font-black text-rose-700 dark:text-rose-450">{stats.atRiskCount}</p>
            <p className="text-xs text-rose-600/70 dark:text-rose-500/70 font-bold mt-2">Inactive for over 7 days</p>
        </div>
      </div>

      {/* Main Filter Section */}
      <div className="bg-white dark:bg-slate-900/40 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/60 overflow-hidden transition-colors duration-300">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h2 className="font-black text-slate-900 dark:text-white tracking-tight">Leaderboard Ranking</h2>
          
          <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search student or ID..." 
                className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-transparent dark:border-slate-800 text-sm rounded-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 w-full transition-all dark:text-white"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Course Filter */}
            <div className="relative">
              <select
                className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-transparent dark:border-slate-800 text-sm rounded-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 cursor-pointer transition-all w-full md:w-48 dark:text-slate-350"
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
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-transparent dark:border-slate-800 text-sm rounded-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 cursor-pointer transition-all w-full md:w-40 dark:text-slate-350"
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
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            {/* Quick Sort Options Dropdown (useful for mobile) */}
            <div className="relative md:hidden">
              <select
                className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-transparent dark:border-slate-800 text-sm rounded-xl outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 cursor-pointer transition-all w-full dark:text-slate-350"
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
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-[#0f172a]/30 text-slate-850 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/80">
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-56">Student Info</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider w-64">Course</th>
                {renderSortHeader("Lesson Mastery", "mastery")}
                {renderSortHeader("Study Time Progress", "studyTime")}
                {renderSortHeader("Quiz Progress", "quiz")}
                {renderSortHeader("Last Active", "lastActive")}
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No student progress records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-150">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{record.name}</p>
                        <p className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-450 mt-0.5">{record.studentId}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{record.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-300 text-sm line-clamp-1">{record.courseName}</p>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 uppercase font-black tracking-wider mt-0.5">
                          {record.courseCode}
                        </p>
                      </div>
                    </td>
                    
                    {/* Mastery Progress Column */}
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center w-36">
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-450">{record.progress}% Mastery</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                            {record.completedLessons}/{record.totalLessons} lessons
                          </span>
                        </div>
                        <div className="w-36 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${record.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                            style={{ width: `${record.progress}%` }} 
                          />
                        </div>
                      </div>
                    </td>

                    {/* Study Time Progress Column */}
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center w-36">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{record.studyTimeProgress}% Target</span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">
                            {formatActiveTime(record.activeSeconds)}
                          </span>
                        </div>
                        <div className="w-36 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${record.studyTimeProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                            style={{ width: `${record.studyTimeProgress}%` }} 
                          />
                        </div>
                      </div>
                    </td>

                    {/* Quiz Progress Column */}
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center w-36">
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">{record.quizProgress}% Quizzes</span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">
                            {record.quizzesDone}/{record.totalQuizzes} done
                          </span>
                        </div>
                        <div className="w-36 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              record.totalQuizzes === 0 ? 'bg-slate-200 dark:bg-slate-700' :
                              record.quizProgress === 100 ? 'bg-emerald-500' : 'bg-purple-550'
                            }`} 
                            style={{ width: `${record.totalQuizzes === 0 ? 0 : record.quizProgress}%` }} 
                          />
                        </div>
                      </div>
                    </td>

                    {/* Last Active */}
                    <td className="px-6 py-4 text-xs text-slate-700 dark:text-slate-400 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span>{formatLastActive(record.lastActive)}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${
                        record.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/30' :
                        record.status === 'Slow Progress' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-455 border-amber-100 dark:border-amber-900/30' :
                        record.status === 'At Risk' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-455 border-rose-100 dark:border-rose-900/30' :
                        'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-455 border-blue-100 dark:border-blue-900/30'
                      }`}>
                        {record.status === 'Completed' ? <CheckCircle2 size={9} /> : 
                         record.status === 'At Risk' ? <AlertCircle size={9} /> : <Clock size={9} />}
                        {record.status}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <a 
                        href={`/admin/students?query=${record.name}`}
                        className="inline-flex p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-450 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="Manage Student details"
                      >
                        <ArrowUpRight size={18} />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Medium and Mobile Stack View */}
        <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/40">
          {paginatedRecords.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
              No student progress records found.
            </div>
          ) : (
            paginatedRecords.map((record) => (
              <div key={record.id} className="p-5 space-y-4 hover:bg-slate-50/30 dark:hover:bg-slate-850/10 transition-all duration-150">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{record.name}</h3>
                    <p className="font-mono text-[10px] text-blue-600 dark:text-blue-450 mt-0.5">{record.studentId}</p>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500">{record.email}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    record.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/30' :
                    record.status === 'Slow Progress' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-455 border-amber-100 dark:border-amber-900/30' :
                    record.status === 'At Risk' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-455 border-rose-100 dark:border-rose-900/30' :
                    'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-455 border-blue-100 dark:border-blue-900/30'
                  }`}>
                    {record.status}
                  </span>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl p-4.5 space-y-4 border border-slate-100/50 dark:border-slate-850">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 dark:text-slate-550 font-black uppercase tracking-wider text-[9px]">Course</span>
                    <span className="font-bold text-slate-800 dark:text-slate-300 text-right max-w-[200px] line-clamp-1">{record.courseName}</span>
                  </div>

                  {/* 1. Mastery Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1"><BookOpen size={12} /> Mastery Progress</span>
                      <span>{record.progress}% ({record.completedLessons}/{record.totalLessons} lessons)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${record.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                        style={{ width: `${record.progress}%` }} 
                      />
                    </div>
                  </div>

                  {/* 2. Study Time Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-indigo-650 dark:text-indigo-400 flex items-center gap-1"><Clock size={12} /> Study Time Target</span>
                      <span>{record.studyTimeProgress}% ({formatActiveTime(record.activeSeconds)} / 5h)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${record.studyTimeProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${record.studyTimeProgress}%` }} 
                      />
                    </div>
                  </div>

                  {/* 3. Quiz Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1"><HelpCircle size={12} /> Quiz Milestones</span>
                      <span>{record.quizProgress}% ({record.quizzesDone}/{record.totalQuizzes} completed)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          record.totalQuizzes === 0 ? 'bg-slate-300 dark:bg-slate-700' :
                          record.quizProgress === 100 ? 'bg-emerald-500' : 'bg-purple-500'
                        }`} 
                        style={{ width: `${record.totalQuizzes === 0 ? 0 : record.quizProgress}%` }} 
                      />
                    </div>
                  </div>

                  {/* Last Active Timestamp footer in card */}
                  <div className="pt-3 border-t border-slate-200/50 dark:border-slate-850 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                    <Calendar size={12} />
                    <span>Last active on LMS: {formatLastActive(record.lastActive)}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <a 
                    href={`/admin/students?query=${record.name}`}
                    className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-all"
                  >
                    View student profile <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className="px-6 py-5 bg-slate-50/70 dark:bg-[#0f172a]/10 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} student course enrollments
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
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
