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

const typeText: Record<string, string> = {
  word: "text-blue-500",
  excel: "text-emerald-500",
  powerpoint: "text-orange-500",
  onenote: "text-purple-500",
  canva: "text-pink-500",
  notion: "text-slate-500 dark:text-slate-400",
  windows: "text-sky-500",
  notes: "text-amber-500",
};

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
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">{editingId ? 'Edit Study Material' : 'Add Study Material'}</h3>
              <button onClick={closeForm} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-hide">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Material Title</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Intro to HTML5 Guide"
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors text-sm text-slate-900 dark:text-slate-100" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Type (Category)</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="word" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Word</option>
                    <option value="excel" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Excel</option>
                    <option value="powerpoint" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">PowerPoint</option>
                    <option value="onenote" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">OneNote</option>
                    <option value="canva" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Canva</option>
                    <option value="notion" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Notion</option>
                    <option value="windows" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Windows</option>
                    <option value="notes" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Notes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Content URL</label>
                  <input 
                    required
                    type="url" 
                    value={formData.content_url}
                    onChange={(e) => setFormData({...formData, content_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors text-sm text-slate-900 dark:text-slate-100" 
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={isSubmitting}
                  className="flex-[2] py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  {editingId ? 'Update Material' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">Course</span>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors text-sm text-slate-700 dark:text-slate-300 cursor-pointer max-w-[16rem]"
          >
            <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All courses</option>
            {courses.map(course => (
              <option key={course.id} value={course.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{course.title}</option>
            ))}
          </select>
        </label>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-sm font-medium transition-colors w-fit cursor-pointer"
        >
          <Plus size={14} />
          New material
        </button>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 px-1 -mb-3">
        {filteredMaterials.length} {filteredMaterials.length === 1 ? "material" : "materials"}
      </p>

      {/* List */}
      {filteredMaterials.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">No materials found.</div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 border-y border-slate-100 dark:border-slate-800/80">
          {filteredMaterials.map((material) => {
            const batchName = material.batches?.[0] || material.batch;
            const isDoc = !!typeText[material.type];
            return (
              <li
                key={material.id}
                className="group flex items-center gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
              >
                <div className={`shrink-0 ${typeText[material.type] || 'text-slate-400'}`}>
                  {material.type === 'notes' ? <BookOpenIcon size={18} /> : isDoc ? <FileText size={18} /> : <LinkIcon size={18} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{material.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {[(material.courses as any)?.title, batchName, material.file_size || material.duration || 'External']
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <span className="hidden sm:block w-24 text-xs text-slate-400 dark:text-slate-500 capitalize">{material.type}</span>

                <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setAssigningMaterial(material);
                      setAssignFormData({
                        course_id: material.course_id || "",
                        batch: material.batches?.[0] || ""
                      });
                    }}
                    className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors cursor-pointer"
                    title="Assign Course/Batch"
                  >
                    <GraduationCap size={16} />
                  </button>
                  <button
                    onClick={() => handleEdit(material)}
                    className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  {material.type !== 'note' && material.type !== 'code' && (
                    <a href={material.content_url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors" title="Open">
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(material.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {assigningMaterial && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">Assign Course & Batch</h3>
              <button 
                onClick={() => setAssigningMaterial(null)} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-3 mb-2">
                <p className="text-xs text-slate-400">Material Title</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 text-sm mt-1">{assigningMaterial.title}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Link to Course</label>
                <select 
                  value={assignFormData.course_id}
                  onChange={(e) => setAssignFormData({...assignFormData, course_id: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Not Assigned (General)</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{course.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Target Batch</label>
                <select 
                  value={assignFormData.batch}
                  onChange={(e) => setAssignFormData({...assignFormData, batch: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Batches</option>
                  {(availableBatches as any[])
                    .filter(batch => !assignFormData.course_id || batch.course_id === assignFormData.course_id)
                    .map(batch => (
                      <option key={batch.title} value={batch.title} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{batch.title}</option>
                    ))
                  }
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setAssigningMaterial(null)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  disabled={isAssignSubmitting}
                  className="flex-[2] py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
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
