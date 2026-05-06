"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { assignCourseToStudent, removeCourseFromStudent, updateEnrollmentBatch } from "@/app/actions/admin";
import DeleteButton from "@/components/admin/DeleteButton";
import { Loader2, Power, PowerOff, ShieldCheck, UserMinus, Settings, X, Check, Search as SearchIcon, PlusCircle, BookOpen, Trash2, Users, Edit2 } from "lucide-react";

export default function StudentTable({ initialStudents, availableBatches = [] }: { initialStudents: any[], availableBatches?: string[] }) {
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
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  // Change Batch State
  const [editingBatchFor, setEditingBatchFor] = useState<any | null>(null);
  const [newBatch, setNewBatch] = useState<string>("");

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
      const result = await assignCourseToStudent(assigningTo.id, selectedCourseId, selectedBatch);

      if (result?.error) {
        alert(result.error);
        return;
      }

      setAssigningTo(null);
      setSelectedCourseId("");
      setSelectedBatch("");
      router.refresh();
      alert("Course assigned successfully!");
    } catch (err) {
      console.error("Error assigning course:", err);
      alert("Failed to assign course");
    } finally {
      setIsSubmitting(false);
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

  const handleChangeBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatchFor) return;

    setIsSubmitting(true);
    try {
      const result = await updateEnrollmentBatch(editingBatchFor.id, newBatch || null);

      if (result?.error) {
        alert(result.error);
        return;
      }

      setEditingBatchFor(null);
      setNewBatch("");
      router.refresh();
      alert("Batch updated successfully!");
    } catch (err) {
      console.error("Error updating batch:", err);
      alert("Failed to update batch");
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

  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStudent) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${editingStudent.student_id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      setEditingStudent({ ...editingStudent, photo_url: publicUrl });
      alert("Photo uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Failed to upload photo: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
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
          course: editingStudent.course,
          father_name: editingStudent.father_name,
          mother_name: editingStudent.mother_name,
          dob: editingStudent.dob,
          gender: editingStudent.gender,
          aadhar_no: editingStudent.aadhar_no,
          admission_date: editingStudent.admission_date,
          education: editingStudent.education,
          category: editingStudent.category,
          address: editingStudent.address,
          photo_url: editingStudent.photo_url
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Settings size={18} className="text-blue-600" />
                Edit Student Details
              </h3>
              <button onClick={() => setEditingStudent(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateStudent} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[70vh] px-2 pb-4 custom-scrollbar">
                
                {/* Photo Upload Section */}
                <div className="col-span-full bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
                  <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center group relative">
                    {editingStudent.photo_url ? (
                      <img src={editingStudent.photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-300 font-black text-4xl">?</div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-600" size={20} />
                      </div>
                    )}
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Student Profile Photo</p>
                    <p className="text-[10px] text-slate-400 font-medium">JPG, PNG or WEBP. Max 2MB.</p>
                  </div>
                  <label className="cursor-pointer px-6 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm">
                    {uploading ? "Uploading..." : "Choose Photo"}
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                  </label>
                  {editingStudent.photo_url && (
                    <p className="text-[9px] font-mono text-blue-500 break-all max-w-[200px]">{editingStudent.photo_url}</p>
                  )}
                </div>

                <div className="space-y-4 col-span-full">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-50 pb-2">Basic & Contact Info</p>
                </div>
                
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
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Phone Number</label>
                  <input 
                    required
                    type="text" 
                    value={editingStudent.phone}
                    onChange={(e) => setEditingStudent({...editingStudent, phone: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                  />
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

                <div className="space-y-4 col-span-full pt-4">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-50 pb-2">Family & Personal Details</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Father's Name</label>
                  <input 
                    type="text" 
                    value={editingStudent.father_name || ""}
                    onChange={(e) => setEditingStudent({...editingStudent, father_name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Mother's Name</label>
                  <input 
                    type="text" 
                    value={editingStudent.mother_name || ""}
                    onChange={(e) => setEditingStudent({...editingStudent, mother_name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Date of Birth</label>
                  <input 
                    type="date" 
                    value={editingStudent.dob || ""}
                    onChange={(e) => setEditingStudent({...editingStudent, dob: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Gender</label>
                  <select 
                    value={editingStudent.gender || ""}
                    onChange={(e) => setEditingStudent({...editingStudent, gender: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Category</label>
                  <input 
                    type="text" 
                    value={editingStudent.category || ""}
                    onChange={(e) => setEditingStudent({...editingStudent, category: e.target.value})}
                    placeholder="General, OBC, SC, ST"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Aadhar Number</label>
                  <input 
                    type="text" 
                    value={editingStudent.aadhar_no || ""}
                    onChange={(e) => setEditingStudent({...editingStudent, aadhar_no: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                  />
                </div>

                <div className="space-y-4 col-span-full pt-4">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-50 pb-2">Academic & Internal</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Education</label>
                  <select 
                    value={editingStudent.education || ""}
                    onChange={(e) => setEditingStudent({...editingStudent, education: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black"
                  >
                    <option value="">Select Education</option>
                    <option value="5th-8th">5th - 8th</option>
                    <option value="10th">10th Pass</option>
                    <option value="12th">12th Pass</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Post Graduate">Post Graduate (PG)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Admission Date</label>
                  <input 
                    type="date" 
                    value={editingStudent.admission_date || ""}
                    onChange={(e) => setEditingStudent({...editingStudent, admission_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Primary Course (ID Code)</label>
                  <input 
                    required
                    type="text" 
                    value={editingStudent.course}
                    onChange={(e) => setEditingStudent({...editingStudent, course: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Full Address</label>
                  <textarea 
                    rows={2}
                    value={editingStudent.address || ""}
                    onChange={(e) => setEditingStudent({...editingStudent, address: e.target.value})}
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

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Select Batch (Optional)</label>
                <div className="relative">
                   <select 
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 transition-all text-sm font-black text-black appearance-none cursor-pointer"
                  >
                    <option value="">No Batch / All Batches</option>
                    {availableBatches.map((batch: string) => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </select>
                  <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
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

      {/* Change Batch Modal */}
      {editingBatchFor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Edit2 size={18} className="text-blue-600" />
                Change Batch
              </h3>
              <button onClick={() => setEditingBatchFor(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 bg-blue-50/30 border-b border-blue-50">
               <p className="text-xs text-blue-600 font-bold mb-1 uppercase tracking-widest">Course:</p>
               <h4 className="text-lg font-black text-blue-900">{editingBatchFor.courses?.title}</h4>
            </div>
            <form onSubmit={handleChangeBatch} className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Select New Batch</label>
                <div className="relative">
                   <select 
                    value={newBatch}
                    onChange={(e) => setNewBatch(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black appearance-none cursor-pointer"
                  >
                    <option value="">No Batch / All Batches</option>
                    {availableBatches.map((batch: string) => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </select>
                  <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingBatchFor(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSubmitting}
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Save Batch
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
                            <span key={enrollment.id} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-2 group hover:border-rose-200 hover:bg-rose-50/30 transition-all">
                              <div className="flex flex-col flex-1">
                                <span className="line-clamp-1">{enrollment.courses?.title}</span>
                                <span className="text-[8px] text-slate-400 uppercase">
                                  {enrollment.courses?.course_code}
                                  {enrollment.batch && <span className="text-emerald-600 font-black ml-1">• {enrollment.batch}</span>}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 items-center justify-center border-l border-slate-200/60 pl-2 ml-1">
                                <button 
                                  onClick={() => {
                                    setEditingBatchFor(enrollment);
                                    setNewBatch(enrollment.batch || "");
                                  }}
                                  className="p-1 hover:bg-blue-100 text-slate-300 hover:text-blue-600 rounded-md transition-all"
                                  title="Change Batch"
                                >
                                  <Edit2 size={10} />
                                </button>
                                <button 
                                  onClick={() => handleRemoveCourse(enrollment.id, enrollment.courses?.title, student.name)}
                                  className="p-1 hover:bg-rose-100 text-slate-300 hover:text-rose-600 rounded-md transition-all"
                                  title="Remove Course"
                                >
                                  <X size={10} />
                                </button>
                              </div>
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
