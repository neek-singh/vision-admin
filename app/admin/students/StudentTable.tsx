"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DeleteButton from "@/components/admin/DeleteButton";
import { Loader2, Power, PowerOff, ShieldCheck, UserMinus, Settings, X, Check, Search as SearchIcon, PlusCircle, BookOpen } from "lucide-react";

export default function StudentTable({ initialStudents }: { initialStudents: any[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // Edit State
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assign Course State
  const [assigningTo, setAssigningTo] = useState<any | null>(null);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

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

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTo || !selectedCourseId) return;

    setIsSubmitting(true);
    try {
      // Check if already enrolled
      const isAlreadyEnrolled = assigningTo.enrollments?.some(
        (e: any) => e.courses?.id === selectedCourseId
      );

      if (isAlreadyEnrolled) {
        alert("Student is already enrolled in this course.");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("enrollments").insert({
        student_id: assigningTo.id,
        course_id: selectedCourseId,
        progress_percentage: 0
      });

      if (error) throw error;

      setAssigningTo(null);
      setSelectedCourseId("");
      router.refresh();
      alert("Course assigned successfully!");
    } catch (err) {
      console.error("Error assigning course:", err);
      alert("Failed to assign course");
    } finally {
      setIsSubmitting(false);
    }
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

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({
          name: editingStudent.name,
          email: editingStudent.email,
          phone: editingStudent.phone,
          course: editingStudent.course
        })
        .eq("id", editingStudent.id);

      if (error) throw error;
      
      setEditingStudent(null);
      router.refresh();
      alert("Student updated successfully!");
    } catch (err) {
      console.error("Error updating student:", err);
      alert("Failed to update student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Student ID", "Name", "Email", "Phone", "Courses", "Status", "Joined Date"];
    const rows = initialStudents.map(s => [
      s.student_id,
      s.name,
      s.email,
      s.phone,
      s.enrollments?.map((e: any) => e.courses?.title).join(" | "),
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
      {/* Edit Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Settings size={18} className="text-blue-600" />
                Edit Student Details
              </h3>
              <button onClick={() => setEditingStudent(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateStudent} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Full Name</label>
                  <input 
                    required
                    type="text" 
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Phone</label>
                    <input 
                      required
                      type="text" 
                      value={editingStudent.phone}
                      onChange={(e) => setEditingStudent({...editingStudent, phone: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Primary Course (ID Generation)</label>
                    <input 
                      required
                      type="text" 
                      value={editingStudent.course}
                      onChange={(e) => setEditingStudent({...editingStudent, course: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Email Address</label>
                  <input 
                    required
                    type="email" 
                    value={editingStudent.email}
                    onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSubmitting}
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Course Modal */}
      {assigningTo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle size={18} className="text-emerald-600" />
                Assign New Course
              </h3>
              <button onClick={() => setAssigningTo(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 bg-blue-50/30 border-b border-blue-50">
               <p className="text-xs text-blue-600 font-bold mb-1 uppercase tracking-widest">Assigning to:</p>
               <h4 className="text-lg font-black text-blue-900">{assigningTo.name}</h4>
               <p className="text-[10px] text-blue-400 font-mono">{assigningTo.student_id}</p>
            </div>
            <form onSubmit={handleAssignCourse} className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Select Course</label>
                <div className="relative">
                   <select 
                    required
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm font-black text-black appearance-none cursor-pointer"
                  >
                    <option value="">Choose a course...</option>
                    {availableCourses.map((course: any) => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                  <BookOpen className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setAssigningTo(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSubmitting || !selectedCourseId}
                  className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Assign Course
                </button>
              </div>
            </form>
          </div>
        </div>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Student</th>
                <th className="px-6 py-4 font-semibold">Contact & ID</th>
                <th className="px-6 py-4 font-semibold">Assigned Courses</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
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
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {student.enrollments?.map((enrollment: any) => (
                            <span key={enrollment.id} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700">
                              {enrollment.courses?.title}
                            </span>
                          ))}
                          <button 
                            onClick={() => {
                              setAssigningTo(student);
                              fetchAvailableCourses();
                            }}
                            className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold hover:bg-blue-100 transition-all flex items-center gap-1"
                          >
                             <PlusCircle size={10} /> Assign
                          </button>
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
      </div>
    </div>
  );
}
