"use client";

import { useState, useEffect } from "react";
import { Loader2, Settings, X, Check, ChevronDown, User, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface StudentEditModalProps {
  student: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StudentEditModal({ student: editingStudent, onClose, onSuccess }: StudentEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localStudent, setLocalStudent] = useState(editingStudent);
  const [availableCourses, setAvailableCourses] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    async function fetchCourses() {
      const { data } = await supabase.from("courses").select("id, title").order("title");
      setAvailableCourses(data || []);
      
      // Auto-fill primary course from enrollments if empty
      if (!localStudent.course || localStudent.course === "N/A") {
        const firstEnrollment = localStudent.enrollments?.[0];
        if (firstEnrollment?.courses?.title) {
          setLocalStudent((prev: any) => ({ ...prev, course: firstEnrollment.courses.title }));
        }
      }
    }
    fetchCourses();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !localStudent) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${localStudent.student_id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      setLocalStudent({ ...localStudent, photo_url: publicUrl });
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Failed to upload photo: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localStudent) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({
          name: localStudent.name,
          email: localStudent.email,
          phone: localStudent.phone,
          course: localStudent.course,
          father_name: localStudent.father_name,
          mother_name: localStudent.mother_name,
          dob: localStudent.dob,
          gender: localStudent.gender,
          aadhar_no: localStudent.aadhar_no,
          admission_date: localStudent.admission_date,
          education: localStudent.education,
          category: localStudent.category,
          address: localStudent.address,
          photo_url: localStudent.photo_url,
          status: localStudent.status || "active",
          dropout_date: localStudent.dropout_date || null,
          dropout_reason: localStudent.dropout_reason || null,
          dropout_remarks: localStudent.dropout_remarks || null
        })
        .eq("id", localStudent.id);

      if (error) throw error;
      
      onSuccess();
      alert("Student updated successfully!");
    } catch (err) {
      console.error("Error updating student:", err);
      alert("Failed to update student");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 my-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Settings size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Edit Student Details
              </h3>
              <p className="text-[10px] text-slate-400 leading-tight">
                ID: {localStudent.student_id || "—"}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleUpdateStudent} className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[68vh] pr-1 pb-2 custom-scrollbar">
            
            {/* Photo Upload Section */}
            <div className="col-span-full bg-slate-50/70 dark:bg-slate-950/50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center gap-3">
              <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs overflow-hidden flex items-center justify-center relative shrink-0">
                {localStudent.photo_url ? (
                  <img src={localStudent.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-slate-300 dark:text-slate-600" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 flex items-center justify-center">
                    <Loader2 className="animate-spin text-blue-600" size={14} />
                  </div>
                )}
              </div>
              <div className="flex-1 w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <label className="cursor-pointer px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 hover:border-blue-500 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-all shadow-2xs flex items-center justify-center gap-1.5 shrink-0">
                  {uploading ? <Loader2 className="animate-spin" size={12} /> : <Upload size={12} />}
                  <span>{uploading ? "Uploading..." : "Upload Photo"}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    value={localStudent.photo_url || ""}
                    onChange={(e) => setLocalStudent({...localStudent, photo_url: e.target.value})}
                    placeholder="Or paste image URL here..."
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Basic & Contact Info */}
            <div className="col-span-full pt-1">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-1">
                Basic &amp; Contact Info
              </span>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Full Name</label>
              <input 
                required
                type="text" 
                value={localStudent.name}
                onChange={(e) => setLocalStudent({...localStudent, name: e.target.value})}
                className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Phone Number</label>
              <input 
                required
                type="text" 
                value={localStudent.phone}
                onChange={(e) => setLocalStudent({...localStudent, phone: e.target.value})}
                className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
              <input 
                required
                type="email" 
                value={localStudent.email}
                onChange={(e) => setLocalStudent({...localStudent, email: e.target.value})}
                className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white" 
              />
            </div>

            {/* Family & Personal Details */}
            <div className="col-span-full pt-1">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-1">
                Family &amp; Personal Details
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Father's Name</label>
              <input 
                type="text" 
                value={localStudent.father_name || ""}
                onChange={(e) => setLocalStudent({...localStudent, father_name: e.target.value})}
                className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Mother's Name</label>
              <input 
                type="text" 
                value={localStudent.mother_name || ""}
                onChange={(e) => setLocalStudent({...localStudent, mother_name: e.target.value})}
                className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Date of Birth</label>
              <input 
                type="date" 
                value={localStudent.dob || ""}
                onChange={(e) => setLocalStudent({...localStudent, dob: e.target.value})}
                className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Gender</label>
              <div className="relative">
                <select 
                  value={localStudent.gender || ""}
                  onChange={(e) => setLocalStudent({...localStudent, gender: e.target.value})}
                  className="w-full pl-2.5 pr-7 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Category</label>
              <div className="relative">
                <select 
                  value={localStudent.category || ""}
                  onChange={(e) => setLocalStudent({...localStudent, category: e.target.value})}
                  className="w-full pl-2.5 pr-7 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer"
                >
                  <option value="">Select Category</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Aadhar Number</label>
              <input 
                type="text" 
                value={localStudent.aadhar_no || ""}
                onChange={(e) => setLocalStudent({...localStudent, aadhar_no: e.target.value})}
                className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white" 
              />
            </div>

            {/* Academic & Internal */}
            <div className="col-span-full pt-1">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-1">
                Academic &amp; Internal
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Education</label>
              <div className="relative">
                <select 
                  value={localStudent.education || ""}
                  onChange={(e) => setLocalStudent({...localStudent, education: e.target.value})}
                  className="w-full pl-2.5 pr-7 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer"
                >
                  <option value="">Select Education</option>
                  <option value="5th">5th Pass</option>
                  <option value="6th">6th Pass</option>
                  <option value="7th">7th Pass</option>
                  <option value="8th">8th Pass</option>
                  <option value="10th">10th Pass</option>
                  <option value="12th">12th Pass</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Post Graduate">Post Graduate (PG)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Admission Date</label>
              <input 
                type="date" 
                value={localStudent.admission_date || ""}
                onChange={(e) => setLocalStudent({...localStudent, admission_date: e.target.value})}
                className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Primary Course</label>
              <div className="relative">
                <select 
                  required
                  value={localStudent.course || ""}
                  onChange={(e) => setLocalStudent({...localStudent, course: e.target.value})}
                  className="w-full pl-2.5 pr-7 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer"
                >
                  <option value="">Select Primary Course</option>
                  {availableCourses.map((course) => (
                    <option key={course.id} value={course.title}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Academic Status</label>
              <div className="relative">
                <select 
                  value={localStudent.status || "active"}
                  onChange={(e) => setLocalStudent({...localStudent, status: e.target.value})}
                  className="w-full pl-2.5 pr-7 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white appearance-none cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="dropped_out">Dropped Out (Left)</option>
                  <option value="on_hold">On Hold (Break)</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
              </div>
            </div>

            {localStudent.status === "dropped_out" && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1">Dropout / Left Date</label>
                  <input 
                    type="date" 
                    value={localStudent.dropout_date || ""}
                    onChange={(e) => setLocalStudent({...localStudent, dropout_date: e.target.value})}
                    className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-rose-300 dark:border-rose-900/60 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-rose-500 transition-all text-xs font-semibold text-slate-900 dark:text-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-1">Reason for Leaving</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Relocated, Financial, Exams..."
                    value={localStudent.dropout_reason || ""}
                    onChange={(e) => setLocalStudent({...localStudent, dropout_reason: e.target.value})}
                    className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-rose-300 dark:border-rose-900/60 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-rose-500 transition-all text-xs font-semibold text-slate-900 dark:text-white" 
                  />
                </div>
              </>
            )}
            <div className="col-span-full">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Full Address</label>
              <textarea 
                rows={2}
                value={localStudent.address || ""}
                onChange={(e) => setLocalStudent({...localStudent, address: e.target.value})}
                className="w-full px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 transition-all text-xs font-semibold text-slate-900 dark:text-white resize-none" 
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={13} /> : <Check size={13} />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
