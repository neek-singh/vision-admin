
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
  CheckCircle2,
  HelpCircle,
  PlayCircle,
  Pencil,
  Trophy,
  Users
} from "lucide-react";

export default function TestsClient({ courses, initialTests }: { courses: any[], initialTests: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingResults, setViewingResults] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [formData, setFormData] = useState({
    course_id: "",
    title: "",
    type: "daily",
    duration_minutes: 30
  });

  const fetchResults = async (testId: string) => {
    setIsLoadingResults(true);
    try {
      const { data, error } = await supabase
        .from("test_results")
        .select(`
          *,
          students(name, student_id)
        `)
        .eq("test_id", testId)
        .order("completed_at", { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error("Error fetching results:", err);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleViewResults = (id: string) => {
    setViewingResults(id);
    fetchResults(id);
  };

  const handleEdit = (test: any) => {
    setFormData({
      course_id: test.course_id,
      title: test.title,
      type: test.type || "daily",
      duration_minutes: test.duration_minutes
    });
    setEditingId(test.id);
    setIsAdding(true);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ course_id: "", title: "", type: "daily", duration_minutes: 30 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("tests")
          .update(formData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tests")
          .insert([formData]);
        if (error) throw error;
      }

      closeForm();
      router.refresh();
    } catch (err: any) {
      console.error("Error creating test:", err);
      alert(`Failed to create test: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("tests")
        .update({ is_published: !currentStatus })
        .eq("id", id);
      
      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error("Error toggling publish status:", err);
      alert("Failed to update status");
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
              <h3 className="font-bold text-slate-900">{editingId ? 'Edit Quiz' : 'New Quiz'}</h3>
              <button onClick={closeForm} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Link to Course</label>
                  <select 
                    required
                    value={formData.course_id}
                    onChange={(e) => setFormData({...formData, course_id: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500 transition-all text-sm font-bold text-slate-900"
                  >
                    <option value="">Select course...</option>
                    {courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Test Title</label>
                  <input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500 transition-all text-sm font-bold text-slate-900" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Test Category</label>
                    <select 
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500 transition-all text-sm font-bold text-slate-900"
                    >
                      <option value="daily">Daily Test</option>
                      <option value="weekly">Weekly Test</option>
                      <option value="monthly">Monthly Test</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Duration (Mins)</label>
                    <input required type="number" value={formData.duration_minutes} onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 0})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500 transition-all text-sm font-bold text-slate-900" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeForm} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl">Cancel</button>
                <button disabled={isSubmitting} className="flex-[2] py-3 bg-rose-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                  {editingId ? 'Update Quiz' : 'Create Quiz'}
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
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(test)} className="p-2 text-slate-300 hover:text-indigo-600 rounded-lg transition-all"><Pencil size={18} /></button>
                <button onClick={() => handleDelete(test.id)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
            <div className="space-y-1 mb-6">
              <div className="flex items-center gap-2 mb-1">
                 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                   test.type === 'monthly' ? 'bg-purple-100 text-purple-700' : 
                   test.type === 'weekly' ? 'bg-blue-100 text-blue-700' : 
                   'bg-emerald-100 text-emerald-700'
                 }`}>
                   {test.type || 'daily'}
                 </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">{test.title}</h3>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{test.courses?.title}</p>
                <button 
                  onClick={() => handleTogglePublish(test.id, test.is_published)}
                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all ${
                    test.is_published ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {test.is_published ? 'Published' : 'Draft'}
                </button>
              </div>
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
            <div className="grid grid-cols-2 gap-3 mt-auto">
              <button 
                onClick={() => handleViewResults(test.id)}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Users size={14} />
                Results
              </button>
              <button 
                onClick={() => router.push(`/admin/lms/tests/${test.id}`)}
                className="py-3 bg-slate-900 hover:bg-rose-600 text-white text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <PlayCircle size={14} />
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Results Modal */}
      {viewingResults && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200">
                    <Trophy size={24} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none mb-1">Test Results</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {initialTests.find(t => t.id === viewingResults)?.title}
                    </p>
                 </div>
              </div>
              <button onClick={() => setViewingResults(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {isLoadingResults ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-rose-600" size={40} />
                  <p className="text-slate-400 font-bold text-sm">Loading scores...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                    <FileText size={32} />
                  </div>
                  <p className="text-slate-400 font-bold">No students have completed this test yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4 text-center">Score</th>
                        <th className="px-6 py-4 text-center">Percentage</th>
                        <th className="px-6 py-4 text-right">Completed At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {results.map((res) => (
                        <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-black text-slate-900 text-sm">{res.students?.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{res.students?.student_id}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-600 rounded-full font-black text-xs">
                              {res.score} / {res.total_questions}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden max-w-[100px] mx-auto">
                               <div 
                                 className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                                 style={{ width: `${(res.score / res.total_questions) * 100}%` }}
                               />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 mt-1 block">
                               {Math.round((res.score / res.total_questions) * 100)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-[10px] font-bold text-slate-500">
                            {new Date(res.completed_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
