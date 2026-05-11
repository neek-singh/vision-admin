"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MultiSelect from "@/components/ui/MultiSelect";

interface LessonFormModalProps {
  courseId: string;
  moduleId: string;
  isEditing: boolean;
  lessonId?: string;
  initialData?: any;
  availableBatches: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function LessonFormModal({ 
  courseId, 
  moduleId, 
  isEditing, 
  lessonId, 
  initialData, 
  availableBatches, 
  onClose, 
  onSuccess 
}: LessonFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lesson, setLesson] = useState({
    title: initialData?.title || "",
    type: initialData?.type || initialData?.lesson_type || "video",
    content_url: initialData?.content_url || "",
    html_content: initialData?.notes_content || "",
    is_free: initialData?.is_free || false,
    is_locked: initialData?.is_locked || false,
    order_index: initialData?.order_index || 0,
    batches: initialData?.batches || [],
    scheduled_at: initialData?.scheduled_at || ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson.title || !moduleId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        module_id: moduleId,
        title: lesson.title,
        subtitle: null,
        type: 'video', // Workaround for strict DB check constraint
        content_url: lesson.content_url,
        notes_content: lesson.html_content,
        duration: null,
        is_free: lesson.is_free,
        batches: lesson.batches,
        scheduled_at: lesson.scheduled_at || null,
        course_id: courseId,
        lesson_type: lesson.type
      };

      let error;
      if (isEditing && lessonId) {
        const { error: updateError } = await supabase
          .from("lessons")
          .update(payload)
          .eq("id", lessonId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("lessons").insert(payload);
        error = insertError;
      }

      if (!error) {
        alert("Saved successfully!");
        onSuccess();
      } else {
        alert("Error saving: " + error.message);
      }
    } catch (err) {
      console.error("Error saving lesson:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] overflow-y-auto p-4 animate-in fade-in duration-300">
      <div className="min-h-full flex items-center justify-center py-8">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-black text-slate-900">{isEditing ? "Edit Topic" : "Add New Topic"}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-all"><X size={18} className="text-slate-900" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2 group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Topic Title</label>
                <input 
                  required type="text" value={lesson.title}
                  onChange={(e) => setLesson({...lesson, title: e.target.value})}
                  className="w-full px-0 py-2 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-slate-900" 
                />
              </div>

              
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Content Type</label>
                <select 
                  value={lesson.type}
                  onChange={(e) => setLesson({...lesson, type: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black"
                >
                  <option value="video">Video Lesson</option>
                  <option value="notes">Reading Notes</option>

                  <option value="assignment">Project Assignment</option>
                </select>
              </div>

              {lesson.type === 'video' ? (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">YouTube Video URL</label>
                  <input 
                    type="text" value={lesson.content_url}
                    placeholder="https://www.youtube.com/watch?v=..."
                    onChange={(e) => setLesson({...lesson, content_url: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                  />
                </div>
              ) : (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">HTML Content / Code Support</label>
                  <textarea 
                    value={lesson.html_content}
                    placeholder="Paste your HTML or text content here..."
                    onChange={(e) => setLesson({...lesson, html_content: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-700 min-h-[200px] font-mono" 
                  />
                </div>
              )}

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Unlock Schedule (Date & Time)</label>
                <input 
                  type="datetime-local" value={lesson.scheduled_at}
                  onChange={(e) => setLesson({...lesson, scheduled_at: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black" 
                />
                <p className="text-[9px] text-slate-400 font-medium">Leave empty to unlock immediately.</p>
              </div>

              <div className="md:col-span-2 space-y-2">
                <MultiSelect 
                  label="Visible to Batches"
                  options={availableBatches.map(b => ({ value: b.id, label: b.batch_display }))}
                  selected={lesson.batches}
                  onChange={(s) => setLesson({...lesson, batches: s})}
                />
              </div>


            </div>

            <div className="pt-6 flex gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button 
                disabled={isSubmitting}
                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (isEditing ? "Update Topic" : "Create Topic")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
