
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Trash2, 
  Loader2,
  X,
  CheckCircle2,
  HelpCircle
} from "lucide-react";

export default function QuestionsClient({ testId, initialQuestions }: { testId: string, initialQuestions: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_option_index: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("test_questions")
        .insert([{
          test_id: testId,
          ...formData,
          order_index: initialQuestions.length
        }]);

      if (error) throw error;

      setIsAdding(false);
      setFormData({ question_text: "", options: ["", "", "", ""], correct_option_index: 0 });
      router.refresh();
    } catch (err) {
      console.error("Error adding question:", err);
      alert("Failed to add question");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const { error } = await supabase.from("test_questions").delete().eq("id", id);
      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error("Error deleting question:", err);
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all"
      >
        <Plus size={18} />
        Add Question
      </button>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Add Question</h3>
              <button onClick={() => setIsAdding(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Question Text</label>
                <textarea 
                  required 
                  value={formData.question_text} 
                  onChange={(e) => setFormData({...formData, question_text: e.target.value})} 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold resize-none" 
                  rows={3}
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Options (Mark correct one)</label>
                {formData.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, correct_option_index: idx})}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        formData.correct_option_index === idx ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {formData.correct_option_index === idx ? <CheckCircle2 size={18} /> : <span>{String.fromCharCode(65 + idx)}</span>}
                    </button>
                    <input 
                      required
                      type="text" 
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...formData.options];
                        newOpts[idx] = e.target.value;
                        setFormData({...formData, options: newOpts});
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                    />
                  </div>
                ))}
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl">Cancel</button>
                <button disabled={isSubmitting} className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {initialQuestions.map((q, qidx) => (
          <div key={q.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative group">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex gap-3">
                <span className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs font-black">{qidx + 1}</span>
                <p className="font-bold text-slate-900 text-lg leading-tight">{q.question_text}</p>
              </div>
              <button onClick={() => handleDelete(q.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 size={18} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt: string, oidx: number) => (
                <div key={oidx} className={`p-3 rounded-xl border text-sm font-bold flex items-center gap-3 ${
                  q.correct_option_index === oidx ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-transparent text-slate-500"
                }`}>
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${
                    q.correct_option_index === oidx ? "bg-emerald-600 text-white" : "bg-white text-slate-300"
                  }`}>
                    {String.fromCharCode(65 + oidx)}
                  </span>
                  {opt}
                  {q.correct_option_index === oidx && <CheckCircle2 size={14} className="ml-auto" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
