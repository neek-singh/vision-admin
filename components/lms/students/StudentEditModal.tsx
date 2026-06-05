"use client";

import { useState, useEffect } from "react";
import { Loader2, Settings, X, Check } from "lucide-react";
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
          photo_url: localStudent.photo_url
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 my-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Settings size={18} className="text-blue-600" />
            Edit Student Details
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleUpdateStudent} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[70vh] px-2 pb-4 custom-scrollbar">
            
            {/* Photo Upload Section */}
            <div className="col-span-full bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center group relative">
                {localStudent.photo_url ? (
                  <img src={localStudent.photo_url} alt="Profile" className="w-full h-full object-cover" />
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
              <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                <label className="cursor-pointer w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm flex items-center justify-center gap-2">
                  {uploading ? <Loader2 className="animate-spin" size={14} /> : null}
                  {uploading ? "Uploading..." : "Upload Photo"}
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
                
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400">URL</span>
                  </div>
                  <input 
                    type="text" 
                    value={localStudent.photo_url || ""}
                    onChange={(e) => setLocalStudent({...localStudent, photo_url: e.target.value})}
                    placeholder="Paste image link here..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-[10px] font-medium text-slate-600 shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 col-span-full">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-50 pb-2">Basic & Contact Info</p>
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Full Name</label>
              <input 
                required
                type="text" 
                value={localStudent.name}
                onChange={(e) => setLocalStudent({...localStudent, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Phone Number</label>
              <input 
                required
                type="text" 
                value={localStudent.phone}
                onChange={(e) => setLocalStudent({...localStudent, phone: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Email Address</label>
              <input 
                required
                type="email" 
                value={localStudent.email}
                onChange={(e) => setLocalStudent({...localStudent, email: e.target.value})}
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
                value={localStudent.father_name || ""}
                onChange={(e) => setLocalStudent({...localStudent, father_name: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Mother's Name</label>
              <input 
                type="text" 
                value={localStudent.mother_name || ""}
                onChange={(e) => setLocalStudent({...localStudent, mother_name: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Date of Birth</label>
              <input 
                type="date" 
                value={localStudent.dob || ""}
                onChange={(e) => setLocalStudent({...localStudent, dob: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Gender</label>
              <select 
                value={localStudent.gender || ""}
                onChange={(e) => setLocalStudent({...localStudent, gender: e.target.value})}
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
              <select 
                value={localStudent.category || ""}
                onChange={(e) => setLocalStudent({...localStudent, category: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black"
              >
                <option value="">Select Category</option>
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Aadhar Number</label>
              <input 
                type="text" 
                value={localStudent.aadhar_no || ""}
                onChange={(e) => setLocalStudent({...localStudent, aadhar_no: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
              />
            </div>

            <div className="space-y-4 col-span-full pt-4">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-50 pb-2">Academic & Internal</p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Education</label>
              <select 
                value={localStudent.education || ""}
                onChange={(e) => setLocalStudent({...localStudent, education: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black"
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
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Admission Date</label>
              <input 
                type="date" 
                value={localStudent.admission_date || ""}
                onChange={(e) => setLocalStudent({...localStudent, admission_date: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Primary Course</label>
              <select 
                required
                value={localStudent.course || ""}
                onChange={(e) => setLocalStudent({...localStudent, course: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black appearance-none cursor-pointer"
              >
                <option value="">Select Primary Course</option>
                {availableCourses.map((course) => (
                  <option key={course.id} value={course.title}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-full">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Full Address</label>
              <textarea 
                rows={2}
                value={localStudent.address || ""}
                onChange={(e) => setLocalStudent({...localStudent, address: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
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
  );
}
