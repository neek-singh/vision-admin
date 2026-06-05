"use client";

import { useState } from "react";
import { Loader2, PlusCircle, X, BookOpen, Check } from "lucide-react";
import { assignCourseToStudent } from "@/app/actions/lms/admin";

interface AssignCourseModalProps {
  student: any;
  availableCourses: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignCourseModal({ student, availableCourses, onClose, onSuccess }: AssignCourseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const handleAssignCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !selectedCourseId) return;

    setIsSubmitting(true);
    try {
      const result = await assignCourseToStudent(student.id, selectedCourseId);

      if (result?.error) {
        alert(result.error);
        return;
      }

      onSuccess();
      alert("Course assigned successfully!");
    } catch (err) {
      console.error("Error assigning course:", err);
      alert("Failed to assign course");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <PlusCircle size={18} className="text-emerald-600" />
            Assign New Course
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 bg-blue-50/30 border-b border-blue-50">
           <p className="text-xs text-blue-600 font-bold mb-1 uppercase tracking-widest">Assigning to:</p>
           <h4 className="text-lg font-black text-blue-900">{student.name}</h4>
           <p className="text-[10px] text-blue-400 font-mono">{student.student_id}</p>
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
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              disabled={isSubmitting || !selectedCourseId}
              className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              Add Course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
