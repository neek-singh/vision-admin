"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { removeCourseFromStudent } from "@/app/actions/lms/admin";
import DeleteButton from "@/components/ui/DeleteButton";
import { Loader2, BookOpen, Search as SearchIcon, Users, Edit2, X, ShieldCheck, UserMinus, Settings } from "lucide-react";
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

export default function StudentTable({ initialStudents, availableBatches = [] }: { initialStudents: any[], availableBatches?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // Modal Control State
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [assigningTo, setAssigningTo] = useState<any | null>(null);
  const [editingBatchFor, setEditingBatchFor] = useState<any | null>(null);
  const [isAssigningBatchTo, setIsAssigningBatchTo] = useState<any | null>(null);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);

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
    router.refresh();
  };

  const exportCSV = () => {
    const headers = ["Student ID", "Name", "Email", "Phone", "Courses", "Status", "Joined Date"];
    const rows = initialStudents.map(s => [
      s.student_id,
      s.name,
      s.email,
      s.phone,
      s.enrollments?.map((e: any) => (e.courses as any)?.title).join(" | "),
      s.status || "active",
      new Date(s.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `students_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 md:max-w-md">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or student ID..."
            className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
            <SearchIcon className="w-4 h-4" />
          </button>
        </form>

        <button
          onClick={exportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all border border-emerald-100"
        >
          <span>Export CSV</span> 📊
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Contact & ID</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Assigned Courses</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-right text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No students found.
                  </td>
                </tr>
              ) : (
                initialStudents.map((student) => {
                  const firstName = student.name.split(" ")[0];
                  const last4 = student.phone?.slice(-4) || "0000";
                  const passHint = `${firstName}@${last4}`;
                  const isActive = (student.status || "active") === "active";
                  
                  return (
                    <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{student.name}</div>
                        <div className="text-[10px] font-mono font-black text-amber-600 mt-1">Hint: {passHint}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-[10px] font-bold text-blue-600 mb-1">{student.student_id}</div>
                        <div className="text-xs text-gray-500">{student.phone}</div>
                        <div className="text-[10px] text-gray-400">{student.email}</div>
                        {student.batch && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100 text-[10px] font-black uppercase">
                            <Users size={10} /> {student.batch}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {student.enrollments?.map((enrollment: any) => (
                            <span key={enrollment.id} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-2 group hover:border-rose-200 hover:bg-rose-50/30 transition-all">
                              <div className="flex flex-col flex-1">
                                <span className="line-clamp-1">{(enrollment.courses as any)?.title}</span>
                                <span className="text-[8px] text-slate-400 uppercase">
                                  {(enrollment.courses as any)?.course_code}
                                  {enrollment.batch && <span className="text-emerald-600 font-black ml-1">• {enrollment.batch}</span>}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 items-center justify-center border-l border-slate-200/60 pl-2 ml-1">
                                <button 
                                  onClick={() => setEditingBatchFor(enrollment)}
                                  className="p-1 hover:bg-blue-100 text-slate-300 hover:text-blue-600 rounded-md transition-all"
                                  title="Change Batch"
                                >
                                  <Edit2 size={10} />
                                </button>
                                <button 
                                  onClick={() => handleRemoveCourse(enrollment.id, (enrollment.courses as any)?.title, student.name)}
                                  className="p-1 hover:bg-rose-100 text-slate-300 hover:text-rose-600 rounded-md transition-all"
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
                              className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5"
                            >
                               <BookOpen size={10} /> Add Course
                            </button>
                            <button 
                              onClick={() => setIsAssigningBatchTo(student)}
                              disabled={!student.enrollments || student.enrollments.length === 0}
                              className={`px-2 py-1 border rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50
                                ${student.batch 
                                  ? "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100" 
                                  : "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"}`}
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
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                          ${isActive 
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" 
                            : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
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
                            onClick={() => setEditingStudent(student)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
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
        <div className="md:hidden divide-y divide-gray-50 bg-white">
          {initialStudents.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 font-medium">
              No students found.
            </div>
          ) : (
            initialStudents.map((student) => {
              const isActive = (student.status || "active") === "active";
              const firstName = student.name.split(" ")[0];
              const last4 = student.phone?.slice(-4) || "0000";
              const passHint = `${firstName}@${last4}`;

              return (
                <div key={student.id} className="p-5 space-y-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900 leading-tight">{student.name}</h4>
                      <p className="font-mono text-[10px] font-bold text-blue-600 mt-0.5 tracking-wider uppercase">{student.student_id}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Support:</span>
                         <span className="text-[9px] font-mono font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100/50">{passHint}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStatus(student.id, student.status || "active")}
                      disabled={isUpdating === student.id}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shrink-0
                      ${isActive 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-rose-50 text-rose-700 border-rose-100"}`}
                    >
                      {isUpdating === student.id ? <Loader2 size={10} className="animate-spin" /> : (isActive ? <ShieldCheck size={10} /> : <UserMinus size={10} />)}
                      {student.status || "active"}
                    </button>
                  </div>

                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 space-y-3">
                    <div className="flex justify-between items-center">
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Details</p>
                          <p className="text-xs font-black text-slate-700">{student.phone}</p>
                          <p className="text-[10px] font-bold text-slate-400 truncate">{student.email}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Primary Batch</p>
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100/50 text-[9px] font-black uppercase tracking-wider">
                            <Users size={10} /> {student.batch || "UNASSIGNED"}
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Active Enrollments ({student.enrollments?.length || 0})</p>
                    <div className="flex flex-wrap gap-2">
                      {student.enrollments?.map((enrollment: any) => (
                        <div key={enrollment.id} className="flex items-center gap-2 pl-3 pr-1 py-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                           <div className="flex flex-col">
                             <span className="text-[10px] font-black text-slate-800 line-clamp-1">{(enrollment.courses as any)?.title}</span>
                             <span className="text-[8px] font-bold text-slate-400">{(enrollment.courses as any)?.course_code} {enrollment.batch && `• ${enrollment.batch}`}</span>
                           </div>
                           <button 
                             onClick={() => handleRemoveCourse(enrollment.id, (enrollment.courses as any)?.title, student.name)}
                             className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                           >
                             <X size={10} />
                           </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => { setAssigningTo(student); fetchAvailableCourses(); }}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                      >
                        + Add Course
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button 
                      onClick={() => setEditingStudent(student)}
                      className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-100 shadow-sm"
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
    </div>
  );
}
