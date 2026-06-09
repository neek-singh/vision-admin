"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { removeCourseFromStudent } from "@/app/actions/lms/admin";
import DeleteButton from "@/components/ui/DeleteButton";
import { 
  Loader2, 
  BookOpen, 
  Search as SearchIcon, 
  Users, 
  Edit2, 
  X, 
  ShieldCheck, 
  UserMinus, 
  Settings, 
  IdCard,
  RotateCcw,
  Trash2,
  Check
} from "lucide-react";
import dynamic from "next/dynamic";

const StudentEditModal = dynamic(() => import("@/components/lms/students/StudentEditModal"), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
});

const AssignCourseModal = dynamic(() => import("@/components/lms/students/AssignCourseModal"), { 
  ssr: false 
});

const BatchAssignmentModal = dynamic(() => import("@/components/lms/students/BatchAssignmentModal"), { 
  ssr: false 
});

const StudentIdCardModal = dynamic(() => import("@/components/lms/students/StudentIdCardModal"), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
});

export default function StudentTable({ 
  initialStudents, 
  availableBatches = [],
  availableCourses: passedCourses = []
}: { 
  initialStudents: any[], 
  availableBatches?: string[],
  availableCourses?: any[]
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Filter States
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  
  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // Modal Control State
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [assigningTo, setAssigningTo] = useState<any | null>(null);
  const [editingBatchFor, setEditingBatchFor] = useState<any | null>(null);
  const [isAssigningBatchTo, setIsAssigningBatchTo] = useState<any | null>(null);
  const [idCardStudent, setIdCardStudent] = useState<any | null>(null);
  const [availableCourses, setAvailableCourses] = useState<any[]>(passedCourses);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("query", query);
    } else {
      params.delete("query");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const fetchAvailableCourses = async () => {
    if (availableCourses.length > 0) return;
    const { data } = await supabase.from("courses").select("id, title").order("title");
    setAvailableCourses(data || []);
  };

  const toggleStatus = async (studentId: string, currentStatus: string) => {
    setIsUpdating(studentId);
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    
    try {
      const { error } = await supabase
        .from("students")
        .update({ status: newStatus })
        .eq("id", studentId);

      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error("Error updating student status:", err);
      alert("Failed to update status");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveCourse = async (enrollmentId: string, courseTitle: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove "${courseTitle}" from ${studentName}?`)) return;

    try {
      const result = await removeCourseFromStudent(enrollmentId);

      if (result?.error) {
        alert(result.error);
        return;
      }

      router.refresh();
      alert("Course removed successfully!");
    } catch (err) {
      console.error("Error removing course:", err);
      alert("Failed to remove course");
    }
  };

  const onSuccess = () => {
    setEditingStudent(null);
    setAssigningTo(null);
    setEditingBatchFor(null);
    setIsAssigningBatchTo(null);
    setIdCardStudent(null);
    setSelectedIds([]);
    router.refresh();
  };

  // Client-Side Dynamic Filtering
  const filteredStudents = initialStudents.filter(student => {
    // Search match
    const matchesQuery = !query || 
      student.name.toLowerCase().includes(query.toLowerCase()) || 
      student.student_id.toLowerCase().includes(query.toLowerCase()) ||
      (student.phone && student.phone.includes(query)) ||
      (student.email && student.email.toLowerCase().includes(query.toLowerCase()));

    // Status match
    const isActive = (student.status || "active") === "active";
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && isActive) || 
      (selectedStatus === "inactive" && !isActive);

    // Batch match
    const matchesBatch = !selectedBatch || student.batch === selectedBatch;

    // Course match
    const matchesCourse = !selectedCourse || 
      student.enrollments?.some((e: any) => (e.courses as any)?.id === selectedCourse);

    return matchesQuery && matchesStatus && matchesBatch && matchesCourse;
  });

  const toggleSelectAll = () => {
    if (filteredStudents.length === 0) return;
    const allFilteredSelected = filteredStudents.every(s => selectedIds.includes(s.id));
    if (allFilteredSelected) {
      // Deselect only the filtered ones
      const filteredIds = filteredStudents.map(s => s.id);
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered ones
      const newSelections = filteredStudents.map(s => s.id);
      setSelectedIds(prev => {
        const merged = new Set([...prev, ...newSelections]);
        return Array.from(merged);
      });
    }
  };

  // Bulk Actions
  const handleBulkStatusChange = async (newStatus: "active" | "inactive") => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({ status: newStatus })
        .in("id", selectedIds);

      if (error) throw error;
      alert(`Successfully updated status to ${newStatus} for ${selectedIds.length} students.`);
      setSelectedIds([]);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update status in bulk");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkBatchChange = async (batchVal: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    const targetBatch = batchVal === "clear" ? null : batchVal;
    try {
      // 1. Update students global batch
      const { error: studentError } = await supabase
        .from("students")
        .update({ batch: targetBatch })
        .in("id", selectedIds);

      if (studentError) throw studentError;

      // 2. Update enrollments batch for these students
      const { error: enrollError } = await supabase
        .from("enrollments")
        .update({ batch: targetBatch })
        .in("student_id", selectedIds);

      if (enrollError) throw enrollError;

      alert(`Successfully updated batch for ${selectedIds.length} students.`);
      setSelectedIds([]);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update batch in bulk");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmDelete = confirm(`Are you sure you want to delete the ${selectedIds.length} selected students? This action is permanent and cannot be undone.`);
    if (!confirmDelete) return;

    setIsBulkUpdating(true);
    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;
      alert(`Successfully deleted ${selectedIds.length} students.`);
      setSelectedIds([]);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete students in bulk");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) return;
    const studentsToExport = initialStudents.filter(s => selectedIds.includes(s.id));
    exportCSVData(studentsToExport, "selected_students");
  };

  const exportAllCSV = () => {
    exportCSVData(initialStudents, "all_students");
  };

  const exportCSVData = (studentsList: any[], filenamePrefix: string) => {
    const headers = ["Student ID", "Name", "Email", "Phone", "Courses", "Status", "Joined Date"];
    const rows = studentsList.map(s => [
      s.student_id,
      s.name,
      s.email,
      s.phone,
      s.enrollments?.map((e: any) => (e.courses as any)?.title).join(" | "),
      s.status || "active",
      new Date(s.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats Calculations
  const totalStudents = initialStudents.length;
  const activeStudents = initialStudents.filter(s => (s.status || "active") === "active").length;
  const batchAssigned = initialStudents.filter(s => s.batch).length;
  const totalEnrollments = initialStudents.reduce((acc, s) => acc + (s.enrollments?.length || 0), 0);

  return (
    <div className="space-y-8 pb-20">
      {/* Lazy Loaded Modals */}
      {editingStudent && (
        <StudentEditModal 
          student={editingStudent} 
          onClose={() => setEditingStudent(null)} 
          onSuccess={onSuccess} 
        />
      )}

      {assigningTo && (
        <AssignCourseModal 
          student={assigningTo} 
          availableCourses={availableCourses} 
          onClose={() => setAssigningTo(null)} 
          onSuccess={onSuccess} 
        />
      )}

      {(editingBatchFor || isAssigningBatchTo) && (
        <BatchAssignmentModal 
          enrollment={editingBatchFor} 
          student={isAssigningBatchTo}
          availableBatches={availableBatches} 
          onClose={() => { setEditingBatchFor(null); setIsAssigningBatchTo(null); }} 
          onSuccess={onSuccess} 
        />
      )}

      {idCardStudent && (
        <StudentIdCardModal 
          student={idCardStudent} 
          onClose={() => setIdCardStudent(null)} 
        />
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Students */}
        <div className="relative overflow-hidden bg-white dark:bg-[#0f172a]/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/10 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Students</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{totalStudents}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">All registered profiles</span>
          </div>
        </div>

        {/* Card 2: Active Students */}
        <div className="relative overflow-hidden bg-white dark:bg-[#0f172a]/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Active Students</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{activeStudents}</h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-100/30">
              {totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}% Active Rate
            </span>
          </div>
        </div>

        {/* Card 3: Batch Assigned */}
        <div className="relative overflow-hidden bg-white dark:bg-[#0f172a]/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 dark:bg-amber-500/10 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Batch Assigned</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{batchAssigned}</h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              {totalStudents > 0 ? totalStudents - batchAssigned : 0} unassigned students
            </span>
          </div>
        </div>

        {/* Card 4: Course Enrollments */}
        <div className="relative overflow-hidden bg-white dark:bg-[#0f172a]/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 dark:bg-violet-500/10 rounded-full translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Course Enrollments</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{totalEnrollments}</h3>
            </div>
            <div className="p-3 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-2xl">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              {totalStudents > 0 ? (totalEnrollments / totalStudents).toFixed(1) : 0} avg. courses/student
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Interactive Filters Section */}
      <div className="bg-slate-50/50 dark:bg-[#0f172a]/20 border border-slate-200/40 dark:border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Filter Records</h4>
          
          {/* Status Tabs */}
          <div className="flex bg-slate-100 dark:bg-[#090f1f]/80 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedStatus("all")}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                selectedStatus === "all"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-extrabold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("active")}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                selectedStatus === "active"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-extrabold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("inactive")}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                selectedStatus === "inactive"
                  ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-450 shadow-sm font-extrabold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, phone or student ID..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/65 dark:border-slate-800/80 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
            />
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          </form>

          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
            {/* Batch Select */}
            <div className="relative w-full sm:w-48">
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full pl-3.5 pr-8 py-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">All Batches</option>
                {availableBatches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <Users size={12} />
              </div>
            </div>

            {/* Course Select */}
            <div className="relative w-full sm:w-56">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full pl-3.5 pr-8 py-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">All Courses</option>
                {availableCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <BookOpen size={12} />
              </div>
            </div>

            {/* Reset Filters button */}
            {(query || selectedBatch || selectedCourse || selectedStatus !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSelectedBatch("");
                  setSelectedCourse("");
                  setSelectedStatus("all");
                  // Clear URL params
                  const params = new URLSearchParams(searchParams);
                  params.delete("query");
                  router.replace(`${pathname}`);
                }}
                className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}

            <button
              onClick={exportAllCSV}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all border border-emerald-100 dark:border-emerald-900/30 cursor-pointer"
            >
              <span>Export CSV</span> 📊
            </button>
          </div>
        </div>
      </div>

      {/* Table & mobile card section */}
      <div className="bg-white dark:bg-slate-900/40 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/60 overflow-hidden transition-colors duration-300">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-[#0f172a]/30 text-slate-850 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/80">
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider w-12 text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.includes(s.id))}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 border-slate-350 dark:border-slate-700 rounded focus:ring-blue-500 bg-white dark:bg-slate-900 cursor-pointer"
                    />
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Contact & ID</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Assigned Courses</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-right text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const firstName = student.name.split(" ")[0];
                  const last4 = student.phone?.slice(-4) || "0000";
                  const passHint = `${firstName}@${last4}`;
                  const isActive = (student.status || "active") === "active";
                  const isSelected = selectedIds.includes(student.id);
                  
                  return (
                    <tr 
                      key={student.id} 
                      className={`border-b border-slate-50 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all ${
                        isSelected ? "bg-blue-50/20 dark:bg-blue-950/15" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, student.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== student.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-slate-350 dark:border-slate-700 rounded focus:ring-blue-500 bg-white dark:bg-slate-900 cursor-pointer"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{student.name}</div>
                        <div className="text-[10px] font-mono font-black text-amber-600 mt-1 dark:text-amber-500">Hint: {passHint}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-450 mb-1">{student.student_id}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-350">{student.phone}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{student.email}</div>
                        {student.batch && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-900/30 text-[10px] font-black uppercase">
                            <Users size={10} /> {student.batch}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                          {student.enrollments?.map((enrollment: any) => (
                            <span key={enrollment.id} className="px-2 py-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 group hover:border-rose-200 dark:hover:border-rose-900/50 hover:bg-rose-50/30 dark:hover:bg-rose-950/10 transition-all">
                              <div className="flex flex-col flex-1">
                                <span className="line-clamp-1">{(enrollment.courses as any)?.title}</span>
                                <span className="text-[8px] text-slate-400 dark:text-slate-550 uppercase">
                                  {(enrollment.courses as any)?.course_code}
                                  {enrollment.batch && <span className="text-emerald-600 dark:text-emerald-400 font-black ml-1">• {enrollment.batch}</span>}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 items-center justify-center border-l border-slate-200/60 dark:border-slate-700/60 pl-2 ml-1">
                                <button 
                                  onClick={() => setEditingBatchFor(enrollment)}
                                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all"
                                  title="Change Batch"
                                >
                                  <Edit2 size={10} />
                                </button>
                                <button 
                                  onClick={() => handleRemoveCourse(enrollment.id, (enrollment.courses as any)?.title, student.name)}
                                  className="p-1 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-slate-300 hover:text-rose-600 dark:hover:text-rose-450 rounded-md transition-all"
                                  title="Remove Course"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            </span>
                          ))}
                          <div className="flex flex-col gap-1 w-full mt-2">
                            <button 
                              onClick={() => {
                                setAssigningTo(student);
                                fetchAvailableCourses();
                              }}
                              className="px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-lg text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                               <BookOpen size={10} /> Add Course
                            </button>
                            <button 
                              onClick={() => setIsAssigningBatchTo(student)}
                              disabled={!student.enrollments || student.enrollments.length === 0}
                              className={`px-2 py-1 border rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer
                                ${student.batch 
                                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30 hover:bg-amber-100" 
                                  : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100"}`}
                            >
                               {student.batch ? <Edit2 size={10} /> : <Users size={10} />}
                               {student.batch ? "Exchange Batch" : "Assign Batch"}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(student.id, student.status || "active")}
                          disabled={isUpdating === student.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer
                          ${isActive 
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 hover:bg-emerald-100 dark:hover:bg-emerald-500/20" 
                            : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-450 hover:bg-rose-100 dark:hover:bg-rose-500/20"}`}
                        >
                          {isUpdating === student.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            isActive ? <ShieldCheck size={12} /> : <UserMinus size={12} />
                          )}
                          {student.status || "active"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => setIdCardStudent(student)}
                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                            title="Generate ID Card"
                          >
                            <IdCard size={18} />
                          </button>
                          <button 
                            onClick={() => setEditingStudent(student)}
                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                            title="Edit Student"
                          >
                            <Settings size={18} />
                          </button>
                          <DeleteButton id={student.id} table="students" title={student.name} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
          {filteredStudents.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
              No students found.
            </div>
          ) : (
            filteredStudents.map((student) => {
              const isActive = (student.status || "active") === "active";
              const firstName = student.name.split(" ")[0];
              const last4 = student.phone?.slice(-4) || "0000";
              const passHint = `${firstName}@${last4}`;
              const isSelected = selectedIds.includes(student.id);

              return (
                <div 
                  key={student.id} 
                  className={`p-5 space-y-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-200 relative ${
                    isSelected ? "bg-blue-50/10 dark:bg-blue-955/15" : ""
                  }`}
                >
                  {/* Checkbox for mobile selection */}
                  <div className="absolute top-5 right-5 z-10 flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(prev => [...prev, student.id]);
                        } else {
                          setSelectedIds(prev => prev.filter(id => id !== student.id));
                        }
                      }}
                      className="w-4.5 h-4.5 text-blue-600 border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 bg-white dark:bg-slate-900 cursor-pointer"
                    />
                  </div>

                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 dark:text-white leading-tight">{student.name}</h4>
                      <p className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-450 mt-0.5 tracking-wider uppercase">{student.student_id}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                         <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Support:</span>
                         <span className="text-[9px] font-mono font-black text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-100/50 dark:border-amber-900/30">{passHint}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStatus(student.id, student.status || "active")}
                      disabled={isUpdating === student.id}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 cursor-pointer
                      ${isActive 
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-450 border-emerald-100 dark:border-emerald-900/30" 
                        : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-455 border-rose-100 dark:border-rose-900/30"}`}
                    >
                      {isUpdating === student.id ? <Loader2 size={10} className="animate-spin" /> : (isActive ? <ShieldCheck size={10} /> : <UserMinus size={10} />)}
                      {student.status || "active"}
                    </button>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 space-y-3">
                    <div className="flex justify-between items-center">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Contact Details</p>
                          <p className="text-xs font-black text-slate-700 dark:text-slate-200">{student.phone}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 truncate">{student.email}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Primary Batch</p>
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30 text-[9px] font-black uppercase tracking-wider">
                            <Users size={10} /> {student.batch || "UNASSIGNED"}
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest px-1">Active Enrollments ({student.enrollments?.length || 0})</p>
                    <div className="flex flex-wrap gap-2">
                      {student.enrollments?.map((enrollment: any) => (
                        <div key={enrollment.id} className="flex items-center gap-2 pl-3 pr-1 py-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl shadow-sm">
                           <div className="flex flex-col">
                             <span className="text-[10px] font-black text-slate-800 dark:text-slate-205 line-clamp-1">{(enrollment.courses as any)?.title}</span>
                             <span className="text-[8px] font-bold text-slate-450 dark:text-slate-500">{(enrollment.courses as any)?.course_code} {enrollment.batch && `• ${enrollment.batch}`}</span>
                           </div>
                           <button 
                             onClick={() => handleRemoveCourse(enrollment.id, (enrollment.courses as any)?.title, student.name)}
                             className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-all"
                           >
                             <X size={10} />
                           </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => { setAssigningTo(student); fetchAvailableCourses(); }}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none transition-all cursor-pointer"
                      >
                        + Add Course
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3 flex-wrap">
                    <button 
                      onClick={() => setIdCardStudent(student)}
                      className="flex-1 py-3 bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-blue-100/50 dark:border-blue-900/30 shadow-sm transition-all cursor-pointer"
                    >
                      <IdCard size={14} className="text-blue-600 dark:text-blue-400" /> Generate ID Card
                    </button>
                    <button 
                      onClick={() => setEditingStudent(student)}
                      className="flex-1 py-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 shadow-sm transition-all cursor-pointer"
                    >
                      <Settings size={14} className="text-slate-400" /> Manage Student
                    </button>
                    <DeleteButton id={student.id} table="students" title={student.name} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-md text-white border border-slate-800/80 px-6 py-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 animate-in slide-in-from-bottom-8 duration-300 max-w-[90vw] sm:max-w-none">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-450 rounded-xl text-xs font-black">
              {selectedIds.length} Selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          </div>

          <div className="h-[1px] w-full sm:h-6 sm:w-[1px] bg-slate-800" />

          <div className="flex flex-wrap items-center gap-3">
            {/* Bulk Batch Select */}
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkBatchChange(e.target.value);
                    e.target.value = ""; // reset select value after action
                  }
                }}
                disabled={isBulkUpdating}
                className="pl-3 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 outline-none cursor-pointer focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Assign Batch...</option>
                <option value="clear">Remove Batch</option>
                {availableBatches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Bulk Status Select */}
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value as "active" | "inactive");
                    e.target.value = ""; // reset select value
                  }
                }}
                disabled={isBulkUpdating}
                className="pl-3 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 outline-none cursor-pointer focus:border-blue-500 disabled:opacity-50"
              >
                <option value="">Change Status...</option>
                <option value="active">Set Active</option>
                <option value="inactive">Set Inactive</option>
              </select>
            </div>

            {/* Bulk CSV Export */}
            <button
              onClick={handleBulkExport}
              disabled={isBulkUpdating}
              className="px-3.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Export CSV</span> 📊
            </button>

            {/* Bulk Delete */}
            <button
              onClick={handleBulkDelete}
              disabled={isBulkUpdating}
              className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isBulkUpdating ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
