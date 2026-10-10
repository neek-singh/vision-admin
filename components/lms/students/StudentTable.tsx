"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  removeCourseFromStudent,
  moveToTrashStudent,
  bulkMoveToTrashStudents,
  restoreStudent,
  bulkRestoreStudents,
  permanentDeleteStudent,
  emptyTrashStudents,
  updateStudentAcademicStatus,
  bulkUpdateStudentStatus
} from "@/app/actions/lms/admin";
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
  Check,
  KeyRound,
  Copy,
  CheckCircle2,
  Award,
  UserCheck,
  ChevronDown,
  Download,
  Phone,
  Mail,
  Plus
} from "lucide-react";
import dynamic from "next/dynamic";
import StudentTrashBinView from "@/components/lms/students/StudentTrashBinView";

const StudentEditModal = dynamic(() => import("@/components/lms/students/StudentEditModal"), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
});

const StudentDropoutModal = dynamic(() => import("@/components/lms/students/StudentDropoutModal"), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] flex items-center justify-center"><Loader2 className="animate-spin text-rose-600" /></div>
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

const StudentCertificateModal = dynamic(() => import("@/components/lms/students/StudentCertificateModal"), { 
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
});

const getShortCourseName = (title?: string, code?: string): string => {
  if (!title && !code) return "Course";
  
  // If code is already a short uppercase acronym (<= 6 chars, like 'DCA', 'ADCA', 'PGDCA')
  if (code && code.trim().length <= 6 && !code.includes("-")) {
    return code.trim().toUpperCase();
  }

  const clean = (title || code || "").trim();
  const upper = clean.toUpperCase().replace(/[-_]/g, " ").replace(/\s+/g, " ");

  // Standard computer course abbreviations
  if (upper.includes("POST GRADUATE DIPLOMA IN COMPUTER") || upper.includes("PGDCA")) return "PGDCA";
  if (upper.includes("ADVANCED DIPLOMA IN COMPUTER") || upper.includes("ADCA")) return "ADCA";
  if (upper.includes("DIPLOMA IN COMPUTER") || upper.includes("DCA")) return "DCA";
  if (upper.includes("BASIC COMPUTER COURSE") || upper.includes("BASIC COMPUTER")) return "BCC";
  if (upper.includes("CERTIFICATE IN COMPUTER APPLICATION") || upper.includes("CCA")) return "CCA";
  if (upper.includes("COMPUTER TEACHER TRAINING") || upper.includes("CTTC")) return "CTTC";
  if (upper.includes("DESK TOP PUBLISHING") || upper.includes("DESKTOP PUBLISHING") || upper.includes("DTP")) return "DTP";
  if (upper.includes("FINANCIAL ACCOUNTING") || upper.includes("TALLY")) return "Tally";
  if (upper.includes("WEB DESIGN") || upper.includes("WEB DEVELOPMENT")) return "Web Dev";
  if (upper.includes("PYTHON")) return "Python";
  if (upper.includes("JAVA")) return "Java";
  if (upper.includes("DATA ENTRY") || upper.includes("DEO")) return "DEO";
  if (upper.includes("HARDWARE") || upper.includes("NETWORKING")) return "Hardware";
  if (upper.includes("DIGITAL MARKETING")) return "Digital Mkt";
  if (upper.includes("GRAPHIC DESIGN")) return "Graphic";

  if (clean.length <= 10) return clean;

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    const acronym = words.map(w => w[0].toUpperCase()).join("");
    if (acronym.length <= 6) return acronym;
  }

  return clean.slice(0, 14) + "…";
};

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
  const [viewMode, setViewMode] = useState<"active" | "trash">("active");

  // Local student state for instant optimistic UI updates
  const [students, setStudents] = useState<any[]>(initialStudents || []);
  useEffect(() => {
    setStudents(initialStudents || []);
  }, [initialStudents]);
  
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
  const [bulkIdCardData, setBulkIdCardData] = useState<{ students: any[]; courseTitle: string } | null>(null);
  const [certificateStudent, setCertificateStudent] = useState<any | null>(null);
  const [dropoutStudent, setDropoutStudent] = useState<any | null>(null);
  const [availableCourses, setAvailableCourses] = useState<any[]>(passedCourses);

  // Credentials Modal State
  const [credentialsStudent, setCredentialsStudent] = useState<any | null>(null);
  const [isGeneratingCreds, setIsGeneratingCreds] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<{ student_id: string; password: string } | null>(null);
  const [credsError, setCredsError] = useState("");
  const [copiedField, setCopiedField] = useState<"id" | "pass" | null>(null);
  const [credentialsDoneIds, setCredentialsDoneIds] = useState<Set<string>>(new Set());

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (query.trim()) {
      params.set("query", query.trim());
    } else {
      params.delete("query");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearQuery = () => {
    setQuery("");
    const params = new URLSearchParams(searchParams);
    params.delete("query");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const fetchAvailableCourses = async () => {
    if (availableCourses.length > 0) return;
    const { data } = await supabase.from("courses").select("id, title").order("title");
    setAvailableCourses(data || []);
  };

  const handleReactivateStudent = async (student: any) => {
    if (!confirm(`Reactivate "${student.name}" back to Active status?`)) return;
    setIsUpdating(student.id);
    try {
      const result = await updateStudentAcademicStatus({
        id: student.id,
        status: "active",
        dropout_date: null,
        dropout_reason: null,
        dropout_remarks: student.dropout_remarks 
          ? `${student.dropout_remarks} (Reactivated on ${new Date().toISOString().split('T')[0]})` 
          : `Reactivated on ${new Date().toISOString().split('T')[0]}`
      });

      if (result.error) throw new Error(result.error);
      router.refresh();
      alert(`Student ${student.name} reactivated to Active!`);
    } catch (err: any) {
      console.error("Error reactivating student:", err);
      alert(err.message || "Failed to reactivate");
    } finally {
      setIsUpdating(null);
    }
  };

  const renderStatusBadge = (student: any) => {
    const status = student.status || "active";
    const isDropout = status === "dropped_out";
    const isOnHold = status === "on_hold";
    const isCompleted = status === "completed";
    const isActive = status === "active";

    const badgeColor = isActive
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
      : isDropout
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
      : isOnHold
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
      : isCompleted
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
      : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 hover:bg-slate-500/20";

    const dotColor = isActive
      ? "bg-emerald-500"
      : isDropout
      ? "bg-rose-500"
      : isOnHold
      ? "bg-amber-500"
      : isCompleted
      ? "bg-blue-500"
      : "bg-slate-400";

    const label = isDropout ? "Dropped Out" : isOnHold ? "On Hold" : isCompleted ? "Completed" : isActive ? "Active" : "Inactive";
    const tooltip = isDropout 
      ? `Left on: ${student.dropout_date || "N/A"}${student.dropout_reason ? ` • ${student.dropout_reason}` : ""}` 
      : isOnHold 
      ? `Break since: ${student.dropout_date || "N/A"}${student.dropout_reason ? ` • ${student.dropout_reason}` : ""}` 
      : `Status: ${label}`;

    return (
      <button
        onClick={() => {
          if (isActive) {
            setDropoutStudent(student);
          } else {
            handleReactivateStudent(student);
          }
        }}
        disabled={isUpdating === student.id}
        title={tooltip + " (Click to change status)"}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${badgeColor}`}
      >
        {isUpdating === student.id ? (
          <Loader2 size={10} className="animate-spin" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
        )}
        <span>{label}</span>
      </button>
    );
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

  const handleGenerateCredentials = async (student: any) => {
    setCredsError("");
    setGeneratedCreds(null);
    setIsGeneratingCreds(true);
    try {
      const res = await fetch("/api/students/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentDbId: student.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCredsError(data.error || "Failed to generate credentials.");
      } else {
        setGeneratedCreds(data.credentials);
        setCredentialsDoneIds(prev => new Set(prev).add(student.id));
        router.refresh();
      }
    } catch {
      setCredsError("Network error. Please try again.");
    } finally {
      setIsGeneratingCreds(false);
    }
  };

  const copyToClipboard = async (text: string, field: "id" | "pass") => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getInitials = (name: string) => {
    if (!name) return "ST";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Split into active and trashed lists (reactive from local students state)
  const activeStudentsList = students.filter(s => !s.is_deleted);
  const trashedStudentsList = students.filter(s => Boolean(s.is_deleted));

  // Client-Side Dynamic Filtering (active students only)
  const filteredStudents = activeStudentsList.filter(student => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || 
      student.name?.toLowerCase().includes(q) || 
      student.student_id?.toLowerCase().includes(q) ||
      (student.phone && student.phone.includes(q)) ||
      (student.email && student.email.toLowerCase().includes(q));

    const studentStatus = student.status || "active";
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && studentStatus === "active") ||
      (selectedStatus === "dropped_out" && studentStatus === "dropped_out") ||
      (selectedStatus === "on_hold" && studentStatus === "on_hold") ||
      (selectedStatus === "completed" && studentStatus === "completed") ||
      (selectedStatus === "inactive" && studentStatus === "inactive");

    const matchesBatch = !selectedBatch || student.batch === selectedBatch;

    const matchesCourse = !selectedCourse || 
      student.enrollments?.some((e: any) => (e.courses as any)?.id === selectedCourse);

    return matchesQuery && matchesStatus && matchesBatch && matchesCourse;
  });

  const toggleSelectAll = () => {
    if (filteredStudents.length === 0) return;
    const allFilteredSelected = filteredStudents.every(s => selectedIds.includes(s.id));
    if (allFilteredSelected) {
      const filteredIds = filteredStudents.map(s => s.id);
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const newSelections = filteredStudents.map(s => s.id);
      setSelectedIds(prev => {
        const merged = new Set([...prev, ...newSelections]);
        return Array.from(merged);
      });
    }
  };

  // Bulk Actions
  const handleBulkStatusChange = async (newStatus: "active" | "dropped_out" | "on_hold" | "completed" | "inactive") => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const result = await bulkUpdateStudentStatus(selectedIds, newStatus);
      if (result.error) throw new Error(result.error);
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
      const { error: studentError } = await supabase
        .from("students")
        .update({ batch: targetBatch })
        .in("id", selectedIds);

      if (studentError) throw studentError;

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

  // Trash & Permanent Delete Actions
  const handleMoveToTrash = async (student: any) => {
    if (!confirm(`Move "${student.name}" to Trash Bin?\n(You can restore them anytime from the Trash Bin)`)) return;
    setIsUpdating(student.id);
    // Optimistic update
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_deleted: true, deleted_at: new Date().toISOString() } : s));
    try {
      const res = await moveToTrashStudent(student.id);
      if (res?.error) {
        // Rollback
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_deleted: false, deleted_at: null } : s));
        alert(res.error);
        return;
      }
      router.refresh();
    } catch (err: any) {
      console.error("Error moving student to trash:", err);
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_deleted: false, deleted_at: null } : s));
      alert(err.message || "Failed to move to trash");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleBulkMoveToTrash = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Move ${selectedIds.length} selected student(s) to Trash Bin?`)) return;
    setIsBulkUpdating(true);
    const idsToTrash = [...selectedIds];
    // Optimistic update
    setStudents(prev => prev.map(s => idsToTrash.includes(s.id) ? { ...s, is_deleted: true, deleted_at: new Date().toISOString() } : s));
    setSelectedIds([]);
    try {
      const res = await bulkMoveToTrashStudents(idsToTrash);
      if (res?.error) {
        setStudents(prev => prev.map(s => idsToTrash.includes(s.id) ? { ...s, is_deleted: false, deleted_at: null } : s));
        alert(res.error);
        return;
      }
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setStudents(prev => prev.map(s => idsToTrash.includes(s.id) ? { ...s, is_deleted: false, deleted_at: null } : s));
      alert(err.message || "Failed to move students to trash");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleRestoreStudent = async (student: any) => {
    if (!confirm(`Restore "${student.name}" back to Active Students list?`)) return;
    setIsUpdating(student.id);
    // Optimistic update
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_deleted: false, deleted_at: null } : s));
    try {
      const res = await restoreStudent(student.id);
      if (res?.error) {
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_deleted: true } : s));
        alert(res.error);
        return;
      }
      router.refresh();
    } catch (err: any) {
      console.error("Error restoring student:", err);
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_deleted: true } : s));
      alert(err.message || "Failed to restore student");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleBulkRestore = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsBulkUpdating(true);
    // Optimistic update
    setStudents(prev => prev.map(s => ids.includes(s.id) ? { ...s, is_deleted: false, deleted_at: null } : s));
    try {
      const res = await bulkRestoreStudents(ids);
      if (res?.error) {
        setStudents(prev => prev.map(s => ids.includes(s.id) ? { ...s, is_deleted: true } : s));
        alert(res.error);
        return;
      }
      router.refresh();
    } catch (err: any) {
      setStudents(prev => prev.map(s => ids.includes(s.id) ? { ...s, is_deleted: true } : s));
      alert(err.message || "Failed to restore");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handlePermanentDelete = async (student: any) => {
    setIsUpdating(student.id);
    const backup = [...students];
    // Optimistic update
    setStudents(prev => prev.filter(s => s.id !== student.id));
    try {
      const res = await permanentDeleteStudent(student.id);
      if (res?.error) {
        setStudents(backup);
        alert(res.error);
        return;
      }
      router.refresh();
    } catch (err: any) {
      console.error("Permanent delete error:", err);
      setStudents(backup);
      alert(err.message || "Failed to permanently delete student");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleEmptyTrash = async () => {
    const trashedIds = trashedStudentsList.map(s => s.id);
    if (trashedIds.length === 0) return;
    
    const confirm1 = confirm(`⚠️ Warning: You are about to PERMANENTLY DELETE all ${trashedIds.length} student(s) in the Trash Bin!\n\nThis cannot be undone. Continue?`);
    if (!confirm1) return;

    setIsBulkUpdating(true);
    const backup = [...students];
    // Optimistic update
    setStudents(prev => prev.filter(s => !s.is_deleted));
    try {
      const res = await emptyTrashStudents();
      if (res?.error) {
        setStudents(backup);
        alert(res.error);
        return;
      }
      router.refresh();
    } catch (err: any) {
      setStudents(backup);
      alert(err.message || "Failed to empty trash");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) return;
    const studentsToExport = activeStudentsList.filter(s => selectedIds.includes(s.id));
    exportCSVData(studentsToExport, "selected_students");
  };

  const exportAllCSV = () => {
    exportCSVData(activeStudentsList, "active_students");
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

  // Stats Calculations (Active students)
  const totalStudents = activeStudentsList.length;
  const activeStudents = activeStudentsList.filter(s => (s.status || "active") === "active").length;
  const droppedStudents = activeStudentsList.filter(s => s.status === "dropped_out").length;
  const onHoldStudents = activeStudentsList.filter(s => s.status === "on_hold").length;
  const completedStudents = activeStudentsList.filter(s => s.status === "completed").length;
  const batchAssigned = activeStudentsList.filter(s => s.batch).length;
  const totalEnrollments = activeStudentsList.reduce((acc, s) => acc + (s.enrollments?.length || 0), 0);
  const activeRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
  const unassignedCount = Math.max(0, totalStudents - batchAssigned);
  const avgCourses = totalStudents > 0 ? (totalEnrollments / totalStudents).toFixed(1) : "0.0";

  const hasActiveFilters = Boolean(query || selectedBatch || selectedCourse || selectedStatus !== "all");

  const resetFilters = () => {
    setQuery("");
    setSelectedBatch("");
    setSelectedCourse("");
    setSelectedStatus("all");
    const params = new URLSearchParams(searchParams);
    params.delete("query");
    router.replace(pathname);
  };

  return (
    <div className="space-y-3.5 pb-10">
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

      {bulkIdCardData && (
        <StudentIdCardModal
          student={null}
          bulkStudents={bulkIdCardData.students}
          courseTitle={bulkIdCardData.courseTitle}
          onClose={() => setBulkIdCardData(null)}
        />
      )}

      {certificateStudent && (
        <StudentCertificateModal
          student={certificateStudent}
          onClose={() => setCertificateStudent(null)}
        />
      )}

      {dropoutStudent && (
        <StudentDropoutModal
          student={dropoutStudent}
          onClose={() => setDropoutStudent(null)}
          onSuccess={() => {
            setDropoutStudent(null);
            router.refresh();
          }}
        />
      )}

      {/* Render Trash Bin View if active */}
      {viewMode === "trash" ? (
        <StudentTrashBinView
          trashedStudents={trashedStudentsList}
          onRestore={handleRestoreStudent}
          onPermanentDelete={handlePermanentDelete}
          onEmptyTrash={handleEmptyTrash}
          onBulkRestore={handleBulkRestore}
          onBack={() => setViewMode("active")}
          isUpdating={isUpdating}
          isBulkUpdating={isBulkUpdating}
        />
      ) : (
        <>
      {/* ── Statistics Cards (Compact & Clean) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Total Students */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Total Students
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
              <Users size={14} />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {totalStudents}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
            All registered profiles
          </p>
        </div>

        {/* Card 2: Active Students */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Active Students
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck size={14} />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {activeStudents}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {activeRate}% Active
            </span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
            Currently enabled accounts
          </p>
        </div>

        {/* Card 3: Batch Assigned */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-amber-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Batch Assigned
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
              <UserCheck size={14} />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {batchAssigned}
            </span>
            {unassignedCount > 0 && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                {unassignedCount} unassigned
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
            Assigned to learning batches
          </p>
        </div>

        {/* Card 4: Course Enrollments */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-violet-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Course Enrollments
            </span>
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20 group-hover:scale-105 transition-transform">
              <BookOpen size={14} />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {totalEnrollments}
            </span>
            <span className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold">
              {avgCourses} avg/student
            </span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
            Active course allocations
          </p>
        </div>
      </div>

      {/* ── Interactive Filters Section ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3 space-y-2.5 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Filter Records
            </h4>
            <span className="text-[11px] text-slate-400 font-normal">
              ({filteredStudents.length} {filteredStudents.length === 1 ? "student" : "students"})
            </span>

            {/* Trash Bin Toggle Button */}
            <button
              type="button"
              onClick={() => setViewMode("trash")}
              className="ml-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 transition-all cursor-pointer"
              title="Open Trash Bin"
            >
              <Trash2 size={12} />
              <span>Trash Bin</span>
              {trashedStudentsList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-600 text-white leading-none">
                  {trashedStudentsList.length}
                </span>
              )}
            </button>
          </div>
          
          {/* Status Segment Control */}
          <div className="flex flex-wrap bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-800 text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedStatus("all")}
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                selectedStatus === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              All ({totalStudents})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("active")}
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                selectedStatus === "active"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Active ({activeStudents})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("dropped_out")}
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                selectedStatus === "dropped_out"
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Left ({droppedStudents})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("on_hold")}
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                selectedStatus === "on_hold"
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              On Hold ({onHoldStudents})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("completed")}
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                selectedStatus === "completed"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Completed ({completedStudents})
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, phone or student ID..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-lg text-xs outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={clearQuery}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </form>

          <div className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center">
            {/* Batch Select */}
            <div className="relative w-full sm:w-36">
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="appearance-none w-full pl-2.5 pr-7 py-1.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-blue-500 transition-all truncate"
              >
                <option value="">All Batches</option>
                {availableBatches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
            </div>

            {/* Course Select */}
            <div className="relative w-full sm:w-40">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="appearance-none w-full pl-2.5 pr-7 py-1.5 bg-slate-50/80 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-blue-500 transition-all truncate"
              >
                <option value="">All Courses</option>
                {availableCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
            </div>

            {/* Bulk ID Cards button */}
            {selectedCourse && (
              <button
                type="button"
                onClick={() => {
                  const courseObj = availableCourses.find(c => c.id === selectedCourse);
                  if (filteredStudents.length === 0) {
                    alert("No students found in the current course filter.");
                    return;
                  }
                  setBulkIdCardData({
                    students: filteredStudents,
                    courseTitle: courseObj?.title || "Selected Course"
                  });
                }}
                className="w-full sm:w-auto px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <IdCard size={12} />
                <span>Bulk ID Cards</span>
              </button>
            )}

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="w-full sm:w-auto px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1"
                title="Reset filters"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}

            {/* Export CSV button */}
            <button
              onClick={exportAllCSV}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-200/80 dark:border-slate-800 transition-all cursor-pointer shadow-2xs"
            >
              <Download size={12} className="text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Table & Mobile Card Section ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-950/40 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-3.5 py-2.5 w-10 text-center">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.includes(s.id))}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 text-blue-600 border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 bg-white dark:bg-slate-900 cursor-pointer"
                    />
                  </div>
                </th>
                <th className="px-3.5 py-2.5 w-52">Student</th>
                <th className="px-3.5 py-2.5 w-44">Contact &amp; ID</th>
                <th className="px-3.5 py-2.5">Assigned Courses &amp; Batch</th>
                <th className="px-3.5 py-2.5 w-24">Status</th>
                <th className="px-3.5 py-2.5 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2.5">
                        <Users size={16} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        No students found
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Try adjusting your search criteria, batch, or status filters.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={resetFilters}
                          className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isActive = (student.status || "active") === "active";
                  const isSelected = selectedIds.includes(student.id);
                  
                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group ${
                        isSelected ? "bg-blue-50/20 dark:bg-blue-950/15" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3.5 py-2 text-center">
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
                            className="w-3.5 h-3.5 text-blue-600 border-slate-300 dark:border-slate-700 rounded focus:ring-blue-500 bg-white dark:bg-slate-900 cursor-pointer"
                          />
                        </div>
                      </td>

                      {/* Student Info */}
                      <td className="px-3.5 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {getInitials(student.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                              {student.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <span className="text-[10px] text-slate-400">
                                {isActive ? "Active learner" : "Disabled"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact & ID */}
                      <td className="px-3.5 py-2">
                        <div className="space-y-0.5">
                          <span className="inline-block font-mono text-[9px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/80 dark:bg-blue-950/40 px-1.5 py-0.2 rounded border border-blue-100 dark:border-blue-900/30">
                            {student.student_id}
                          </span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            <a href={`tel:${student.phone}`} className="hover:underline">{student.phone || "—"}</a>
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[170px]" title={student.email}>
                            {student.email || "—"}
                          </p>
                        </div>
                      </td>

                      {/* Assigned Courses & Batch (Clean Minimal Badges) */}
                      <td className="px-3.5 py-2">
                        <div className="space-y-1">
                          {/* Course tags list */}
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {student.enrollments?.map((enrollment: any) => {
                              const courseTitle = (enrollment.courses as any)?.title || "Course";
                              const courseCode = (enrollment.courses as any)?.course_code;
                              const shortName = getShortCourseName(courseTitle, courseCode);

                              return (
                                <span 
                                  key={enrollment.id} 
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 rounded-md text-[10px] text-blue-800 dark:text-blue-300 group/tag hover:border-blue-300 transition-all"
                                  title={courseTitle}
                                >
                                  <span className="font-bold tracking-wide">
                                    {shortName}
                                  </span>
                                  {enrollment.batch && (
                                    <span 
                                      className="text-[9px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/15 px-1 py-0.2 rounded truncate max-w-[105px]"
                                      title={enrollment.batch}
                                    >
                                      {enrollment.batch}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-0.5 ml-0.5 border-l border-blue-200 dark:border-blue-800/80 pl-0.5">
                                    <button 
                                      onClick={() => setEditingBatchFor(enrollment)}
                                      className="p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                      title="Edit Batch"
                                    >
                                      <Edit2 size={9} />
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveCourse(enrollment.id, courseTitle, student.name)}
                                      className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                      title="Remove Course"
                                    >
                                      <X size={9} />
                                    </button>
                                  </div>
                                </span>
                              );
                            })}
                          </div>

                          {/* Quick Add Course & Batch Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => {
                                setAssigningTo(student);
                                fetchAvailableCourses();
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100/60 rounded-md border border-blue-200/50 dark:border-blue-900/30 transition-colors cursor-pointer"
                            >
                              <Plus size={10} />
                              <span>Course</span>
                            </button>
                            <button 
                              onClick={() => setIsAssigningBatchTo(student)}
                              disabled={!student.enrollments || student.enrollments.length === 0}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-40 cursor-pointer max-w-[140px] truncate"
                              title={student.batch ? student.batch : "Assign Batch"}
                            >
                              <Users size={10} className="shrink-0" />
                              <span className="truncate">{student.batch ? student.batch : "Assign Batch"}</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-3.5 py-2">
                        {renderStatusBadge(student)}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-0.5">
                          {student.status === "dropped_out" || student.status === "on_hold" ? (
                            <button
                              onClick={() => handleReactivateStudent(student)}
                              disabled={isUpdating === student.id}
                              className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                              title="Reactivate Student"
                            >
                              <UserCheck size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setDropoutStudent(student)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                              title="Mark as Left / Status"
                            >
                              <UserMinus size={14} />
                            </button>
                          )}
                          {!credentialsDoneIds.has(student.id) && (
                            <button 
                              onClick={() => {
                                setCredentialsStudent(student);
                                setGeneratedCreds(null);
                                setCredsError("");
                              }}
                              className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                              title="Generate Credentials"
                            >
                              <KeyRound size={14} />
                            </button>
                          )}
                          <button 
                            onClick={() => setIdCardStudent(student)}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            title="Generate ID Card"
                          >
                            <IdCard size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              if (student.status === "dropped_out") {
                                alert(`⚠️ Note: ${student.name} is marked as Dropped Out (${student.dropout_date || 'Course Incomplete'}). Course Completion Certificates cannot be issued to dropout students.`);
                                return;
                              }
                              setCertificateStudent(student);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            title="Generate Certificate"
                          >
                            <Award size={14} />
                          </button>
                          <button 
                            onClick={() => setEditingStudent(student)}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            title="Edit Student"
                          >
                            <Settings size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveToTrash(student)}
                            disabled={isUpdating === student.id}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            title={`Move "${student.name}" to Trash Bin`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (Clean & Compact) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredStudents.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No students found.
              </p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const isActive = (student.status || "active") === "active";
              const isSelected = selectedIds.includes(student.id);

              return (
                <div 
                  key={student.id} 
                  className={`p-3 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors relative ${
                    isSelected ? "bg-blue-50/15 dark:bg-blue-950/20" : ""
                  }`}
                >
                  {/* Top row */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(student.name)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                          {student.name}
                        </h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-mono text-[9px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/40 px-1 rounded">
                            {student.student_id}
                          </span>
                          {student.batch && (
                            <span className="text-[9px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-1 rounded">
                              {student.batch}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {renderStatusBadge(student)}

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
                        className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-slate-50/60 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <a href={`tel:${student.phone}`} className="text-slate-800 dark:text-slate-200 font-medium hover:underline text-[10px]">
                      {student.phone || "No phone"}
                    </a>
                    <span className="text-slate-400 text-[10px] truncate max-w-[150px]">
                      {student.email || "No email"}
                    </span>
                  </div>

                  {/* Active Enrollments */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Enrolled Courses ({student.enrollments?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {student.enrollments?.map((enrollment: any) => {
                        const courseTitle = (enrollment.courses as any)?.title || "Course";
                        const courseCode = (enrollment.courses as any)?.course_code;
                        const shortName = getShortCourseName(courseTitle, courseCode);

                        return (
                          <span 
                            key={enrollment.id} 
                            className="px-1.5 py-0.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-md text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40"
                            title={courseTitle}
                          >
                            {shortName}
                          </span>
                        );
                      })}
                      {(!student.enrollments || student.enrollments.length === 0) && (
                        <span className="text-[10px] text-slate-400 italic">No courses assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Actions Footer */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => {
                          setAssigningTo(student);
                          fetchAvailableCourses();
                        }}
                        className="text-[10px] text-blue-600 dark:text-blue-400 font-medium hover:underline"
                      >
                        + Course
                      </button>
                      <span className="text-slate-300">•</span>
                      <button 
                        onClick={() => setIsAssigningBatchTo(student)}
                        className="text-[10px] text-slate-600 dark:text-slate-300 font-medium hover:underline"
                      >
                        Batch
                      </button>
                    </div>

                    <div className="flex items-center gap-0.5">
                      {student.status === "dropped_out" || student.status === "on_hold" ? (
                        <button 
                          onClick={() => handleReactivateStudent(student)}
                          disabled={isUpdating === student.id}
                          className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                          title="Reactivate"
                        >
                          <UserCheck size={13} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => setDropoutStudent(student)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Mark Left"
                        >
                          <UserMinus size={13} />
                        </button>
                      )}
                      <button 
                        onClick={() => setIdCardStudent(student)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="ID Card"
                      >
                        <IdCard size={13} />
                      </button>
                      <button 
                        onClick={() => {
                          if (student.status === "dropped_out") {
                            alert(`⚠️ Note: ${student.name} is marked as Dropped Out. Course Completion Certificates cannot be issued to dropout students.`);
                            return;
                          }
                          setCertificateStudent(student);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-600 rounded"
                        title="Certificate"
                      >
                        <Award size={13} />
                      </button>
                      <button 
                        onClick={() => setEditingStudent(student)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Edit"
                      >
                        <Settings size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveToTrash(student)}
                        disabled={isUpdating === student.id}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Move to Trash"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </>
      )}

      {/* ── Floating Bulk Actions Bar ── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-md text-white border border-slate-800/80 px-5 py-3 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-3 animate-in slide-in-from-bottom-6 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold">
              {selectedIds.length} Selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="hidden sm:block h-4 w-[1px] bg-slate-800" />

          <div className="flex flex-wrap items-center gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkBatchChange(e.target.value);
                  e.target.value = "";
                }
              }}
              disabled={isBulkUpdating}
              className="pl-2.5 pr-6 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none cursor-pointer focus:border-blue-500"
            >
              <option value="">Assign Batch...</option>
              <option value="clear">Remove Batch</option>
              {availableBatches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatusChange(e.target.value as any);
                  e.target.value = "";
                }
              }}
              disabled={isBulkUpdating}
              className="pl-2.5 pr-6 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 outline-none cursor-pointer focus:border-blue-500"
            >
              <option value="">Change Status...</option>
              <option value="active">Set Active</option>
              <option value="dropped_out">Set Dropped Out</option>
              <option value="on_hold">Set On Hold</option>
              <option value="completed">Set Completed</option>
              <option value="inactive">Set Inactive</option>
            </select>

            <button
              onClick={handleBulkExport}
              disabled={isBulkUpdating}
              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <Download size={11} />
              <span>Export</span>
            </button>

            <button
              onClick={handleBulkMoveToTrash}
              disabled={isBulkUpdating}
              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              {isBulkUpdating ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              <span>Move to Trash ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Credentials Modal ── */}
      {credentialsStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                <KeyRound size={18} />
              </div>
              <button 
                onClick={() => setCredentialsStudent(null)} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">Student Credentials</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-5">{credentialsStudent.name}</p>

            {generatedCreds ? (
              <div className="space-y-3 mb-5">
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 relative">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Student ID</p>
                  <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{generatedCreds.student_id}</p>
                  <button 
                    onClick={() => copyToClipboard(generatedCreds.student_id, "id")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-blue-600"
                  >
                    {copiedField === "id" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 relative">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Password</p>
                  <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">{generatedCreds.password}</p>
                  <button 
                    onClick={() => copyToClipboard(generatedCreds.password, "pass")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-blue-600"
                  >
                    {copiedField === "pass" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 mb-5 text-xs text-slate-600 dark:text-slate-300">
                <p>Generate login credentials for this student with an auto-generated password.</p>
              </div>
            )}

            {credsError && (
              <p className="text-xs text-rose-500 font-medium mb-4">{credsError}</p>
            )}

            <div className="flex gap-2">
              {!generatedCreds && (
                <button
                  onClick={() => handleGenerateCredentials(credentialsStudent)}
                  disabled={isGeneratingCreds}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isGeneratingCreds ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                  <span>Generate</span>
                </button>
              )}
              <button
                onClick={() => setCredentialsStudent(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
