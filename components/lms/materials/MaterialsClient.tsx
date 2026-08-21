"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  ExternalLink,
  Loader2,
  X,
  Pencil,
  Code,
  CheckCircle2,
  BookOpen as BookOpenIcon,
  GraduationCap
} from "lucide-react";

export default function MaterialsClient({ courses, initialMaterials, availableBatches = [] }: { courses: any[], initialMaterials: any[], availableBatches?: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("all");
  
  // Custom states for assigning courses & batches
  const [assigningMaterial, setAssigningMaterial] = useState<any>(null);
  const [assignFormData, setAssignFormData] = useState({
    course_id: "",
    batch: ""
  });
  const [isAssignSubmitting, setIsAssignSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    course_id: "",
    batch: "",
    title: "",
    type: "word",
    content_url: "",
    file_size: "",
    duration: "",
    code_content: "",
    lesson_id: "",
    is_published: true
  });

  const fetchLessons = async (courseId: string) => {
    if (!courseId) {
      setLessons([]);
      return;
    }
    setIsLoadingLessons(true);
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setLessons(data || []);
    } catch (err) {
      console.error("Error fetching lessons:", err);
    } finally {
      setIsLoadingLessons(false);
    }
  };

  const handleEdit = (material: any) => {
    setFormData({
      course_id: material.course_id,
      batch: material.batch || "",
      title: material.title,
      type: material.type || "pdf",
      content_url: material.content_url || "",
      file_size: material.file_size || "",
      duration: material.duration || "",
      code_content: material.code_content || "",
      lesson_id: material.lesson_id || "",
      is_published: true
    });
    if (material.course_id) fetchLessons(material.course_id);
    setEditingId(material.id);
    setIsAdding(true);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ course_id: "", batch: "", title: "", type: "word", content_url: "", file_size: "", duration: "", code_content: "", lesson_id: "", is_published: true });
    setLessons([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { lesson_id, batch, course_id, ...rest } = formData;
      const payload = {
        ...rest,
        course_id: course_id || null,
        batches: batch ? [batch] : null
      };
      
      if (editingId) {
        const { error } = await supabase
          .from("materials")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("materials")
          .insert([payload]);
        if (error) throw error;
      }

      closeForm();
      router.refresh();
    } catch (err: any) {
      console.error("Error adding material:", err);
      alert(`Failed to add material: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("materials")
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
    if (!confirm("Are you sure you want to delete this material?")) return;

    try {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error("Error deleting material:", err);
      alert("Failed to delete material");
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningMaterial) return;
    setIsAssignSubmitting(true);

    try {
      const { course_id, batch } = assignFormData;
      const payload = {
        course_id: course_id || null,
        batches: batch ? [batch] : null
      };

      const { error } = await supabase
        .from("materials")
        .update(payload)
        .eq("id", assigningMaterial.id);

      if (error) throw error;

      setAssigningMaterial(null);
      router.refresh();
    } catch (err: any) {
      console.error("Error assigning material:", err);
      alert(`Failed to assign material: ${err.message || "Unknown error"}`);
    } finally {
      setIsAssignSubmitting(false);
    }
  };

  const filteredMaterials = selectedCourseFilter === "all"
    ? initialMaterials
    : initialMaterials.filter(m => m.course_id === selectedCourseFilter);

  return (
    <div className="space-y-6">
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">{editingId ? 'Edit Study Material' : 'Add Study Material'}</h3>
              <button onClick={closeForm} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-hide">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Material Title</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Intro to HTML5 Guide"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-black" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Type (Category)</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-black"
                  >
                    <option value="word">Word</option>
                    <option value="excel">Excel</option>
                    <option value="powerpoint">PowerPoint</option>
                    <option value="onenote">OneNote</option>
                    <option value="canva">Canva</option>
                    <option value="notion">Notion</option>
                    <option value="windows">Windows</option>
                    <option value="notes">Notes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Content URL</label>
                  <input 
                    required
                    type="url" 
                    value={formData.content_url}
                    onChange={(e) => setFormData({...formData, content_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-black" 
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
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  {editingId ? 'Update Material' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 shrink-0 w-fit active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Plus size={18} />
          Add Material
        </button>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">Filter by Course:</label>
            <select 
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-xs font-bold text-slate-700"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
              <th className="px-6 py-4">Material</th>
              <th className="px-6 py-4">Course</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredMaterials.map((material) => (
              <tr key={material.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      material.type === 'word' ? 'bg-blue-50 text-blue-600 border-blue-100/50' : 
                      material.type === 'excel' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : 
                      material.type === 'powerpoint' ? 'bg-orange-50 text-orange-600 border-orange-100/50' : 
                      material.type === 'onenote' ? 'bg-purple-50 text-purple-600 border-purple-100/50' : 
                      material.type === 'canva' ? 'bg-pink-50 text-pink-600 border-pink-100/50' : 
                      material.type === 'notion' ? 'bg-slate-100 text-slate-700 border-slate-200/50' : 
                      material.type === 'windows' ? 'bg-sky-50 text-sky-600 border-sky-100/50' : 
                      material.type === 'notes' ? 'bg-amber-50 text-amber-600 border-amber-100/50' : 
                      'bg-slate-50 text-slate-500 border-slate-100/50'
                    }`}>
                      {material.type === 'word' ? <FileText size={18} /> : 
                       material.type === 'excel' ? <FileText size={18} /> : 
                       material.type === 'powerpoint' ? <FileText size={18} /> : 
                       material.type === 'onenote' ? <FileText size={18} /> : 
                       material.type === 'canva' ? <FileText size={18} /> : 
                       material.type === 'notion' ? <FileText size={18} /> : 
                       material.type === 'windows' ? <FileText size={18} /> : 
                       material.type === 'notes' ? <BookOpenIcon size={18} /> : 
                       <LinkIcon size={18} />}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{material.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{material.file_size || material.duration || 'External'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-slate-600 block">{(material.courses as any)?.title}</span>
                  {(material.batches?.[0] || material.batch) && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-widest">
                      {material.batches?.[0] || material.batch}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest">
                      {material.type}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => {
                        setAssigningMaterial(material);
                        setAssignFormData({
                          course_id: material.course_id || "",
                          batch: material.batches?.[0] || ""
                        });
                      }}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      title="Assign Course/Batch"
                    >
                      <GraduationCap size={18} />
                    </button>
                    <button 
                      onClick={() => handleEdit(material)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Pencil size={18} />
                    </button>
                    {material.type !== 'note' && material.type !== 'code' && (
                      <a href={material.content_url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <ExternalLink size={18} />
                      </a>
                    )}
                    <button 
                      onClick={() => handleDelete(material.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assigningMaterial && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Assign Course & Batch</h3>
              <button 
                onClick={() => setAssigningMaterial(null)} 
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Material Title</p>
                <p className="font-bold text-slate-800 text-sm mt-1">{assigningMaterial.title}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Link to Course</label>
                <select 
                  value={assignFormData.course_id}
                  onChange={(e) => setAssignFormData({...assignFormData, course_id: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-black"
                >
                  <option value="">Not Assigned (General)</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Target Batch</label>
                <select 
                  value={assignFormData.batch}
                  onChange={(e) => setAssignFormData({...assignFormData, batch: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-black"
                >
                  <option value="">All Batches</option>
                  {(availableBatches as any[])
                    .filter(batch => !assignFormData.course_id || batch.course_id === assignFormData.course_id)
                    .map(batch => (
                      <option key={batch.title} value={batch.title}>{batch.title}</option>
                    ))
                  }
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setAssigningMaterial(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button 
                  disabled={isAssignSubmitting}
                  className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 text-sm"
                >
                  {isAssignSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
