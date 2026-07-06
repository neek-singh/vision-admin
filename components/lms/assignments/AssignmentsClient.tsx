"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  PenTool, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Loader2,
  X,
  Users,
  Pencil,
  ExternalLink,
  CheckCircle2,
  Clock as ClockIcon
} from "lucide-react";

export default function AssignmentsClient({ courses, initialAssignments, availableBatches = [] }: { courses: any[], initialAssignments: any[], availableBatches?: string[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [formData, setFormData] = useState({
    course_id: "",
    batch: "",
    title: "",
    description: "",
    due_date: "",
    is_published: true
  });
  const [gradingState, setGradingState] = useState<Record<string, { score: string, feedback: string }>>({});
  const [savingGradeId, setSavingGradeId] = useState<string | null>(null);

  const fetchSubmissions = async (assignmentId: string) => {
    setIsLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          *,
          students(name, student_id)
        `)
        .eq("assignment_id", assignmentId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);

      // Initialize grading state
      const initialGrading: Record<string, { score: string, feedback: string }> = {};
      (data || []).forEach(sub => {
        initialGrading[sub.id] = {
          score: sub.score || "",
          feedback: sub.feedback || ""
        };
      });
      setGradingState(initialGrading);
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const handleViewSubmissions = (id: string) => {
    setViewingSubmissions(id);
    fetchSubmissions(id);
  };

  const handleSaveGrade = async (submissionId: string) => {
    const state = gradingState[submissionId];
    if (!state) return;

    setSavingGradeId(submissionId);
    try {
      const numericMarks = parseInt(state.score) || null;

      const { error } = await supabase
        .from("submissions")
        .update({
          score: state.score,
          marks: numericMarks,
          feedback: state.feedback,
          graded_at: new Date().toISOString(),
          status: "graded"
        })
        .eq("id", submissionId);

      if (error) throw error;

      setSubmissions(prev => prev.map(s => s.id === submissionId ? {
        ...s,
        score: state.score,
        marks: numericMarks,
        feedback: state.feedback,
        graded_at: new Date().toISOString(),
        status: "graded"
      } : s));

      alert("Grade saved successfully!");
    } catch (err) {
      console.error("Error saving grade:", err);
      alert("Failed to save grade");
    } finally {
      setSavingGradeId(null);
    }
  };

  const handleEdit = (assignment: any) => {
    // Format date for datetime-local input (YYYY-MM-DDThh:mm)
    const date = new Date(assignment.due_date);
    const formattedDate = date.toISOString().slice(0, 16);
    
    setFormData({
      course_id: assignment.course_id,
      batch: assignment.batch || "",
      title: assignment.title,
      description: assignment.description || "",
      due_date: formattedDate,
      is_published: true
    });
    setEditingId(assignment.id);
    setIsAdding(true);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ course_id: "", batch: "", title: "", description: "", due_date: "", is_published: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("assignments")
          .update(formData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("assignments")
          .insert([formData]);
        if (error) throw error;
      }

      closeForm();
      router.refresh();
    } catch (err) {
      console.error("Error adding assignment:", err);
      alert("Failed to add assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("assignments")
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
    if (!confirm("Are you sure? This will delete all submissions too.")) return;

    try {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error("Error deleting assignment:", err);
      alert("Failed to delete assignment");
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
      >
        <Plus size={18} />
        New Assignment
      </button>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">{editingId ? 'Edit Assignment' : 'Create Assignment'}</h3>
              <button onClick={closeForm} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Target Course</label>
                    <select 
                      required
                      value={formData.course_id}
                      onChange={(e) => setFormData({...formData, course_id: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm font-bold text-black"
                    >
                      <option value="">Select a course...</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Target Batch</label>
                    <select 
                      value={formData.batch}
                      onChange={(e) => setFormData({...formData, batch: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm font-bold text-black"
                    >
                      <option value="">All Batches</option>
                      {availableBatches.map(batch => (
                        <option key={batch} value={batch}>{batch}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Assignment Title</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm font-bold text-black" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Deadline</label>
                  <input 
                    required
                    type="datetime-local" 
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm font-bold text-black" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Description / Instructions</label>
                  <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm font-bold text-black resize-none" 
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSubmitting}
                  className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <PenTool size={18} />}
                  {editingId ? 'Update Assignment' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {initialAssignments.map((assignment) => (
          <div key={assignment.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <PenTool size={20} />
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleEdit(assignment)}
                  className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                >
                  <Pencil size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(assignment.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-1 mb-6">
              <h3 className="text-lg font-black text-slate-900 leading-tight">{assignment.title}</h3>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{(assignment.courses as any)?.title}</p>
                  {assignment.batch && (
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                      {assignment.batch}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 py-4 border-t border-slate-50 text-slate-500">
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <CalendarIcon size={14} className="text-amber-500" />
                Due: {new Date(assignment.due_date).toLocaleString()}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <Users size={14} className="text-indigo-500" />
                Submissions: {assignment.submissions?.[0]?.count || 0}
              </div>
            </div>
            <button 
              onClick={() => handleViewSubmissions(assignment.id)}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-black rounded-xl transition-all border border-slate-100"
            >
              View All Submissions
            </button>
          </div>
        ))}
      </div>

      {/* Submissions Modal */}
      {viewingSubmissions && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Users size={24} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none mb-1">Student Submissions</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {initialAssignments.find(a => a.id === viewingSubmissions)?.title}
                    </p>
                 </div>
              </div>
              <button onClick={() => setViewingSubmissions(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {isLoadingSubmissions ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-indigo-600" size={40} />
                  <p className="text-slate-400 font-bold text-sm">Fetching student data...</p>
                </div>
              ) : submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                    <PenTool size={32} />
                  </div>
                  <p className="text-slate-400 font-bold">No submissions received yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                        <th className="px-6 py-4 w-1/4">Student</th>
                        <th className="px-6 py-4 w-1/5">Work / Date</th>
                        <th className="px-6 py-4 w-1/6">Score / Grade</th>
                        <th className="px-6 py-4 w-1/4">Feedback</th>
                        <th className="px-6 py-4 text-right w-1/6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {submissions.map((sub) => {
                        const state = gradingState[sub.id] || { score: "", feedback: "" };
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors align-top">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-black text-slate-900 text-sm">{(sub.students as any)?.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{(sub.students as any)?.student_id}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <a 
                                  href={sub.content_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-[11px] font-bold underline break-all"
                                >
                                  <ExternalLink size={12} className="shrink-0" />
                                  Open Work
                                </a>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                   <ClockIcon size={10} className="text-slate-400 shrink-0" />
                                   <span className="text-[9px] font-bold">{new Date(sub.submitted_at).toLocaleDateString()} {new Date(sub.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                placeholder="e.g. A+, 90/100"
                                value={state.score}
                                onChange={(e) => setGradingState({
                                  ...gradingState,
                                  [sub.id]: { ...state, score: e.target.value }
                                })}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all text-xs font-bold text-black"
                              />
                              {sub.graded_at && (
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1 block">
                                  Graded
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <textarea
                                rows={2}
                                placeholder="Feedback for student..."
                                value={state.feedback}
                                onChange={(e) => setGradingState({
                                  ...gradingState,
                                  [sub.id]: { ...state, feedback: e.target.value }
                                })}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all text-xs font-bold text-black resize-none"
                              />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                disabled={savingGradeId === sub.id}
                                onClick={() => handleSaveGrade(sub.id)}
                                className="inline-flex items-center gap-1 px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl hover:bg-indigo-600 transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
                              >
                                {savingGradeId === sub.id ? (
                                  <Loader2 size={12} className="animate-spin shrink-0" />
                                ) : (
                                  <CheckCircle2 size={12} className="shrink-0" />
                                )}
                                Save Grade
                              </button>
                            </td>
                          </tr>
                        );
                      })}
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
