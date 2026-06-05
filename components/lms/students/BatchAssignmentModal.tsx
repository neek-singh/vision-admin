"use client";

import { useState } from "react";
import { Loader2, Users, X, Edit2, Check } from "lucide-react";
import { updateEnrollmentBatch, updateStudentBatch } from "@/app/actions/lms/admin";

interface BatchAssignmentModalProps {
  student?: any;
  enrollment?: any;
  availableBatches: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BatchAssignmentModal({ student, enrollment, availableBatches, onClose, onSuccess }: BatchAssignmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBatch, setNewBatch] = useState(enrollment?.batch || student?.batch || "");

  const handleChangeBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (enrollment) {
        // Update specific enrollment batch
        const result = await updateEnrollmentBatch(enrollment.id, newBatch || null);
        if (result?.error) throw new Error(result.error);
      } else if (student) {
        // Update student's global batch (sets all enrollments)
        const result = await updateStudentBatch(student.id, newBatch || null);
        if (result?.error) throw new Error(result.error);
      }

      onSuccess();
      alert("Batch updated successfully!");
    } catch (err: any) {
      console.error("Error updating batch:", err);
      alert(err.message || "Failed to update batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = enrollment ? "Change Batch" : (student?.batch ? "Exchange Batch" : "Assign Batch");
  const subtitle = enrollment ? "Course:" : "Student:";
  const name = enrollment ? enrollment.courses?.title : student?.name;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            {enrollment || student?.batch ? <Edit2 size={18} className="text-amber-600" /> : <Users size={18} className="text-blue-600" />}
            {title}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 bg-blue-50/30 border-b border-blue-50">
           <div className="flex justify-between items-start">
             <div>
               <p className="text-xs text-blue-600 font-bold mb-1 uppercase tracking-widest">{subtitle}</p>
               <h4 className="text-lg font-black text-blue-900">{name}</h4>
               {student?.student_id && !enrollment && <p className="text-[10px] text-blue-400 font-mono">{student.student_id}</p>}
             </div>
             {(enrollment?.batch || student?.batch) && (
               <div className="text-right">
                 <p className="text-[10px] text-amber-600 font-bold mb-1 uppercase tracking-widest">Current Batch:</p>
                 <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-black">
                   {enrollment?.batch || student?.batch}
                 </span>
               </div>
             )}
           </div>
        </div>
        <form onSubmit={handleChangeBatch} className="p-6 space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Select Batch</label>
            <div className="relative">
               <select 
                required
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
            {!enrollment && (
              <p className="mt-3 text-[10px] text-slate-400 font-medium leading-relaxed italic">
                Note: This will set the batch for <span className="text-blue-500 font-bold">all currently enrolled courses</span> for this student.
              </p>
            )}
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
              disabled={isSubmitting}
              className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
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
