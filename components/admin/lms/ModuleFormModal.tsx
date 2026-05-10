"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MultiSelect from "@/components/ui/MultiSelect";

interface ModuleFormModalProps {
  courseId: string;
  batchName: string | null;
  mode: "global" | "batch";
  availableBatches: any[];
  onClose: () => void;
  onSuccess: () => void;
  currentModulesCount: number;
}

export default function ModuleFormModal({ 
  courseId, 
  batchName, 
  mode, 
  availableBatches, 
  onClose, 
  onSuccess,
  currentModulesCount
}: ModuleFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [batches, setBatches] = useState<string[]>(mode === "batch" ? [availableBatches[0]?.id].filter(Boolean) : []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !courseId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("lms_modules").insert({
        course_id: courseId,
        title,
        subtitle: subtitle || null,
        batch: mode === "batch" ? batchName : null,
        batches: batches,
        order_index: currentModulesCount + 1
      });

      if (!error) {
        onSuccess();
      } else {
        alert("Error adding module: " + error.message);
      }
    } catch (err) {
      console.error("Error adding module:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] overflow-y-auto p-4 animate-in fade-in duration-300">
      <div className="min-h-full flex items-center justify-center py-8">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-black text-slate-900">New Module</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-all"><X size={18} className="text-slate-900" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Module Title</label>
              <input 
                autoFocus required type="text" value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fundamental Concepts" 
                className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-lg placeholder:text-slate-300" 
              />
            </div>
            <div className="space-y-2 group">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Module Subtitle</label>
              <input 
                type="text" value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Master the core principles" 
                className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-bold text-slate-700 text-sm placeholder:text-slate-300" 
              />
            </div>
            <div className="space-y-2">
              <MultiSelect 
                label="Assign to Batches"
                options={availableBatches.map(b => ({ value: b.id, label: b.batch_display }))}
                selected={batches}
                onChange={setBatches}
              />
            </div>
            <div className="pt-4">
              <button 
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Create Module"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
