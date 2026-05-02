
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Loader2,
  X,
  Clock,
  PlayCircle,
  HelpCircle
} from "lucide-react";

export default function TestsClient({ courses, initialTests }: { courses: any[], initialTests: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    course_id: "",
    title: "",
    duration_minutes: 30
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("tests")
        .insert([formData]);

      if (error) throw error;

      setIsAdding(false);
      setFormData({ course_id: "", title: "", duration_minutes: 30 });
      router.refresh();
    } catch (err) {
      console.error("Error creating test:", err);
      alert("Failed to create test");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete all questions and results.")) return;

    try {
      const { error } = await supabase.from("tests").delete().eq("id", id);
      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error("Error deleting test:", err);
      alert("Failed to delete test");
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
      >
        <Plus size={18} />
        Create New Test
      </button>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">New Quiz</h3>
              <button onClick={() => setIsAdding(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Link to Course</label>
                  <select 
                    required
                    value={formData.course_id}
                    onChange={(e) => setFormData({...formData, course_id: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500 transition-all text-sm font-bold"
                  >
                    <option value="">Select course...</option>
                    {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Test Title</label>
                  <input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500 transition-all text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Duration (Minutes)</label>
                  <input required type="number" value={formData.duration_minutes} onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500 transition-all text-sm font-bold" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl">Cancel</button>
                <button disabled={isSubmitting} className="flex-[2] py-3 bg-rose-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                  Create Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {initialTests.map((test) => (
          <div key={test.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
             <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                <FileText size={20} />
              </div>
              <button onClick={() => handleDelete(test.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 size={18} /></button>
            </div>
            <div className="space-y-1 mb-6">
              <h3 className="text-lg font-black text-slate-900 leading-tight">{test.title}</h3>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{test.courses?.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-50 text-slate-500">
               <div className="flex items-center gap-2 text-[10px] font-bold">
                <Clock size={14} className="text-amber-500" />
                {test.duration_minutes} mins
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <HelpCircle size={14} className="text-indigo-500" />
                {test.test_questions?.[0]?.count || 0} Questions
              </div>
            </div>
            <button 
              onClick={() => router.push(`/admin/lms/tests/${test.id}`)}
              className="w-full py-3 bg-slate-900 hover:bg-rose-600 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <PlayCircle size={14} />
              Manage Questions
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
