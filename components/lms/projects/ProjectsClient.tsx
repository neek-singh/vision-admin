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

const shortenCourseName = (name: string) => {
  if (!name) return "";
  const upper = name.trim().replace(/\s+/g, ' ').toUpperCase();
  if (upper === "ADVANCED DIPLOMA IN COMPUTER APPLICATIONS") return "ADCA";
  if (upper === "POST GRADUATE DIPLOMA IN COMPUTER APPLICATIONS") return "PGDCA";
  if (upper === "DIPLOMA IN COMPUTER APPLICATIONS") return "DCA";
  if (upper === "BASIC COMPUTER COURSE") return "BCC";
  if (upper === "BASIC COMPUTER FOR BEGINNER" || upper === "BASIC COMPUTER  FOR BEGINNER") return "BCB";
  return name.length > 25 ? name.slice(0, 22) + "..." : name;
};

const getCategoryStyle = (cat: string) => {
  const norm = (cat || "").toLowerCase();
  switch (norm) {
    case "word":
      return "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-950/40";
    case "excel":
      return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/40";
    case "powerpoint":
      return "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-950/40";
    case "onenote":
      return "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-950/40";
    case "notion":
      return "bg-slate-100 dark:bg-slate-800/40 text-slate-800 dark:text-slate-350 border-slate-200 dark:border-slate-800/60";
    case "chatgpt":
      return "bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-950/40";
    case "gemini":
      return "bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-950/40";
    case "claude":
    case "cloude":
      return "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-950/40";
    case "web":
      return "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 border-indigo-100 dark:border-indigo-950/40";
    case "canva":
      return "bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-950/40";
    default:
      return "bg-slate-50 dark:bg-slate-800/20 text-slate-650 dark:text-slate-400 border-slate-100 dark:border-slate-800/30";
  }
};

export default function ProjectsClient({ courses, initialProjects, availableBatches = [] }: { courses: any[], initialProjects: any[], availableBatches?: string[] }) {
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
    category: "",
    is_published: true
  });
  const [gradingState, setGradingState] = useState<Record<string, { score: string, feedback: string }>>({});
  const [savingGradeId, setSavingGradeId] = useState<string | null>(null);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  const filteredProjects = initialProjects.filter(project => {
    const matchesCourse = selectedCourseFilter === "all" || project.course_id === selectedCourseFilter;
    const matchesCategory = selectedCategoryFilter === "all" || project.category === selectedCategoryFilter;
    return matchesCourse && matchesCategory;
  });

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

  const handleEdit = (project: any) => {
    const formattedDate = project.due_date 
      ? new Date(project.due_date).toISOString().slice(0, 16) 
      : "";
    
    setFormData({
      course_id: project.course_id || "",
      batch: project.batch || "",
      title: project.title,
      description: project.description || "",
      due_date: formattedDate,
      category: project.category || "",
      is_published: project.is_published ?? true
    });
    setEditingId(project.id);
    setIsAdding(true);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ course_id: "", batch: "", title: "", description: "", due_date: "", category: "", is_published: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        course_id: formData.course_id || null,
        title: formData.title,
        description: formData.description || null,
        due_date: (formData.due_date && !isNaN(Date.parse(formData.due_date))) 
          ? new Date(formData.due_date).toISOString() 
          : null,
        category: formData.category || null,
        is_published: formData.is_published
      };

      if (editingId) {
        const { error } = await supabase
          .from("assignments")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("assignments")
          .insert([payload]);
        if (error) throw error;
      }

      closeForm();
      router.refresh();
    } catch (err) {
      console.error("Error adding project:", err);
      alert("Failed to add project");
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
      console.error("Error deleting project:", err);
      alert("Failed to delete project");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 shrink-0 w-fit"
        >
          <Plus size={18} />
          New Project
        </button>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">Filter by Course:</label>
            <select 
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 transition-all text-xs font-bold text-slate-700 dark:text-slate-350"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">Filter by Category:</label>
            <select 
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 transition-all text-xs font-bold text-slate-700 dark:text-slate-350"
            >
              <option value="all">All Categories</option>
              {["Word", "Excel", "PowerPoint", "OneNote", "Notion", "ChatGPT", "Gemini", "Claude", "Web", "Canva"].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">{editingId ? 'Edit Project' : 'Create Project'}</h3>
              <button onClick={closeForm} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
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
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Project Title</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Portfolio Website"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm font-bold text-black" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Project Category</label>
                  <select 
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm font-bold text-black"
                  >
                    <option value="">Select a category...</option>
                    {["Word", "Excel", "PowerPoint", "OneNote", "Notion", "ChatGPT", "Gemini", "Claude", "Web", "Canva"].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Project URL / Link</label>
                  <input 
                    required
                    type="url"
                    placeholder="https://example.com/project-guidelines"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm font-bold text-black" 
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
                  {editingId ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-center shadow-sm">
            <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">No projects found for the selected course.</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div key={project.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg flex items-center justify-center text-indigo-650 dark:text-indigo-400 shrink-0">
                  <PenTool size={16} />
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 text-sm font-semibold flex-1">
                  {/* Title */}
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white leading-tight truncate max-w-[180px] sm:max-w-[350px] md:max-w-[450px]" title={project.title}>
                    {project.title}
                  </h3>

                  {/* Bullet */}
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

                  {/* Course Name */}
                  <span 
                    title={(project.courses as any)?.title} 
                    className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-none truncate max-w-[150px] sm:max-w-[200px]"
                  >
                    {shortenCourseName((project.courses as any)?.title)}
                  </span>

                  {/* Category (if present) */}
                  {project.category && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border leading-none ${getCategoryStyle(project.category)}`}>
                        {project.category}
                      </span>
                    </>
                  )}

                  {/* Batch (if present) */}
                  {project.batch && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                      <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded text-[7px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-950/40 leading-none">
                        {project.batch}
                      </span>
                    </>
                  )}

                  {/* Open Project Link Button */}
                  {project.description && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                      <a 
                        href={project.description} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-855 dark:hover:text-indigo-300 font-bold hover:underline bg-indigo-50/50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-lg border border-indigo-100/30 dark:border-indigo-950/40 leading-none"
                      >
                        <ExternalLink size={10} className="shrink-0" />
                        Open Link
                      </a>
                    </>
                  )}

                  {/* Due Date (if present) */}
                  {project.due_date && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1 leading-none">
                        Due: {new Date(project.due_date).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0 sm:self-center">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800/60 leading-none">
                  <Users size={12} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                  Submissions: {project.submissions?.[0]?.count || 0}
                </div>
                <button 
                  onClick={() => handleViewSubmissions(project.id)}
                  className="py-2 px-3.5 bg-slate-900 dark:bg-slate-850 hover:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all"
                >
                  View All Submissions
                </button>
                <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-800 pl-2">
                  <button 
                    onClick={() => handleEdit(project)}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all"
                  >
                    <Pencil size={15} />
                  </button>
                  <button 
                    onClick={() => handleDelete(project.id)}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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
                      {initialProjects.find(p => p.id === viewingSubmissions)?.title}
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
