"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Search, 
  FileText, 
  Video, 
  PenTool, 
  MoreVertical, 
  Settings,
  Trash2,
  ExternalLink,
  ChevronRight,
  Loader2,
  X,
  Check,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Filter,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DeleteButton from "@/components/admin/DeleteButton";
import MultiSelect from "@/components/ui/MultiSelect";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function CourseContentManagement({ 
  initialCourses = [], 
  availableBatches = [], 
  mode = "global" 
}: { 
  initialCourses?: any[], 
  availableBatches?: any[], 
  mode?: "global" | "batch" 
}) {
  const router = useRouter();
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourses[0]?.id || "");
  const [selectedBatchId, setSelectedBatchId] = useState<string>(availableBatches[0]?.id || "");
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'module' | 'lesson', parentId?: string } | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Modal/Form states
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleSubtitle, setNewModuleSubtitle] = useState("");
  const [moduleBatches, setModuleBatches] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBatchObj = availableBatches.find(b => b.id === selectedBatchId);
  const currentCourseId = mode === "batch" ? (selectedBatchObj?.course_id || "") : selectedCourseId;
  const currentBatchName = mode === "batch" ? (selectedBatchObj?.type || null) : null;

  const [lessonForm, setLessonForm] = useState<{moduleId: string, show: boolean, isEditing: boolean, lessonId?: string}>({ moduleId: "", show: false, isEditing: false });
  const [newLesson, setNewLesson] = useState({ 
    title: "", 
    subtitle: "",
    type: "video", 
    content_url: "",
    html_content: "",
    duration: "",
    is_free: false,
    is_locked: false,
    order_index: 0,
    batches: [] as string[]
  });

  useEffect(() => {
    if (currentCourseId) {
      fetchModulesAndLessons(currentCourseId, currentBatchName);
    } else {
      setModules([]);
      setLoading(false);
    }
  }, [currentCourseId, currentBatchName]);

  async function fetchModulesAndLessons(courseId: string, batchName: string | null) {
    setLoading(true);
    let query = supabase
      .from("lms_modules")
      .select(`
        id,
        title,
        subtitle,
        batch,
        batches,
        lessons(*)
      `)
      .eq("course_id", courseId);
    
    // If we are in batch mode, we show all modules for the course 
    // so the admin can manage which ones are active for this batch.
    // If in global mode, we show modules where batch is null.
    if (mode === "global") {
      query = query.is("batch", null);
    }

    try {
      const { data: modulesData, error } = await query.order("order_index");
      if (error) throw error;
      setModules(modulesData || []);
    } catch (err) {
      console.error("Error fetching curriculum:", err);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModuleTitle || !currentCourseId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("lms_modules").insert({
        course_id: currentCourseId,
        title: newModuleTitle,
        subtitle: newModuleSubtitle || null,
        batch: mode === "batch" ? currentBatchName : null,
        batches: moduleBatches,
        order_index: modules.length + 1
      });

      if (!error) {
        setNewModuleTitle("");
        setNewModuleSubtitle("");
        setShowModuleForm(false);
        fetchModulesAndLessons(currentCourseId, currentBatchName);
        router.refresh();
      }
    } catch (err) {
      console.error("Error adding module:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!newLesson.title || !lessonForm.moduleId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        module_id: lessonForm.moduleId,
        title: newLesson.title,
        subtitle: newLesson.subtitle || null,
        type: 'video', // Workaround for strict DB check constraint "lessons_type_check"
        content_url: newLesson.content_url,
        notes_content: newLesson.html_content,
        duration: newLesson.duration ? parseInt(newLesson.duration) : null,
        is_free: newLesson.is_free,
        is_locked: newLesson.is_locked,
        order_index: newLesson.order_index,
        batches: newLesson.batches,
        course_id: currentCourseId,
        lesson_type: newLesson.type // Store the REAL type here
      };

      let error;
      if (lessonForm.isEditing && lessonForm.lessonId) {
        const { error: updateError } = await supabase
          .from("lessons")
          .update(payload)
          .eq("id", lessonForm.lessonId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from("lessons").insert(payload);
        error = insertError;
      }

      if (!error) {
        // Keep the form open as requested, but show success
        alert("Saved successfully!");
        fetchModulesAndLessons(currentCourseId, currentBatchName);
        router.refresh();
      } else {
        alert("Error saving: " + error.message);
      }
    } catch (err) {
      console.error("Error saving lesson:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleEditLesson = (module: any, lesson: any) => {
    setNewLesson({
      title: lesson.title,
      subtitle: lesson.subtitle || "",
      type: lesson.type || lesson.lesson_type,
      content_url: lesson.content_url || "",
      html_content: lesson.notes_content || "",
      duration: lesson.duration || "",
      is_free: lesson.is_free,
      is_locked: lesson.is_locked || false,
      order_index: lesson.order_index,
      batches: lesson.batches || []
    });
    setLessonForm({ moduleId: module.id, show: true, isEditing: true, lessonId: lesson.id });
  };

  const toggleLessonField = async (lessonId: string, field: string, currentValue: boolean) => {
    // Optimistic UI Update
    setModules(prev => prev.map(m => ({
      ...m,
      lessons: m.lessons?.map((l: any) => l.id === lessonId ? { ...l, [field]: !currentValue } : l)
    })));

    try {
      const { error } = await supabase
        .from("lessons")
        .update({ [field]: !currentValue })
        .eq("id", lessonId);
      
      if (error) {
        console.error(`Error from server toggling ${field}:`, error);
        fetchModulesAndLessons(currentCourseId, currentBatchName); // Revert on error
      }
    } catch (err) {
      console.error(`Error toggling ${field}:`, err);
      fetchModulesAndLessons(currentCourseId, currentBatchName); // Revert on error
    }
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  // --- Drag and Drop Logic ---

  const onDragStart = (e: React.DragEvent, id: string, type: 'module' | 'lesson', parentId?: string) => {
    setDraggedItem({ id, type, parentId });
    e.dataTransfer.setData("text/plain", id);
    // Add a ghost effect
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  };

  const onDragEnd = async (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    
    // Final sync with DB on drag end
    if (draggedItem) {
      try {
        if (draggedItem.type === 'module') {
          const updates = modules.map((m, idx) => ({ 
            id: m.id, 
            order_index: idx + 1,
            course_id: currentCourseId,
            title: m.title
          }));
          const { error } = await supabase.from('lms_modules').upsert(updates);
          if (error) throw error;
        } else {
          const moduleIndex = modules.findIndex(m => m.id === draggedItem.parentId);
          if (moduleIndex !== -1) {
            const moduleLessons = modules[moduleIndex].lessons || [];
            const updates = moduleLessons.map((l: any, idx: number) => ({ 
              id: l.id, 
              order_index: idx + 1,
              module_id: draggedItem.parentId,
              course_id: currentCourseId,
              title: l.title
            }));
            const { error } = await supabase.from('lessons').upsert(updates);
            if (error) throw error;
          }
        }
      } catch (err) {
        console.error("Error syncing drag order:", err);
      }
    }
    setDraggedItem(null);
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string, type: 'module' | 'lesson', targetParentId?: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetId || draggedItem.type !== type) return;

    setModules(prev => {
      if (type === 'module') {
        const oldIndex = prev.findIndex(m => m.id === draggedItem.id);
        const newIndex = prev.findIndex(m => m.id === targetId);
        
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;

        const newModules = [...prev];
        const [removed] = newModules.splice(oldIndex, 1);
        newModules.splice(newIndex, 0, removed);
        
        return newModules.map((m, idx) => ({
          ...m,
          order_index: idx + 1
        }));
      } else {
        if (draggedItem.parentId !== targetParentId) return prev;
        
        const moduleIndex = prev.findIndex(m => m.id === targetParentId);
        if (moduleIndex === -1) return prev;
        
        const moduleLessons = [...(prev[moduleIndex].lessons || [])];
        const oldIndex = moduleLessons.findIndex(l => l.id === draggedItem.id);
        const newIndex = moduleLessons.findIndex(l => l.id === targetId);
        
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;

        const [removed] = moduleLessons.splice(oldIndex, 1);
        moduleLessons.splice(newIndex, 0, removed);
        
        const reorderedLessons = moduleLessons.map((l, idx) => ({
          ...l,
          order_index: idx + 1
        }));

        return prev.map((m) => 
          m.id === targetParentId ? { ...m, lessons: reorderedLessons } : m
        );
      }
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const moveItem = async (type: 'module' | 'lesson', id: string, direction: 'up' | 'down', parentId?: string) => {
    if (type === 'module') {
      const index = modules.findIndex(m => m.id === id);
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === modules.length - 1) return;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const newModules = [...modules];
      const [removed] = newModules.splice(index, 1);
      newModules.splice(newIndex, 0, removed);
      
      const reorderedModules = newModules.map((m, idx) => ({ ...m, order_index: idx + 1 }));
      setModules(reorderedModules);

      const updates = reorderedModules.map((m) => ({ 
        id: m.id, 
        order_index: m.order_index,
        course_id: currentCourseId,
        title: m.title
      }));
      await supabase.from('lms_modules').upsert(updates);
    } else {
      const moduleIndex = modules.findIndex(m => m.id === parentId);
      if (moduleIndex === -1) return;
      
      const moduleLessons = [...(modules[moduleIndex].lessons || [])].sort((a, b) => a.order_index - b.order_index);
      const index = moduleLessons.findIndex(l => l.id === id);
      
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === moduleLessons.length - 1) return;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const [removed] = moduleLessons.splice(index, 1);
      moduleLessons.splice(newIndex, 0, removed);
      
      const reorderedLessons = moduleLessons.map((l, idx) => ({ ...l, order_index: idx + 1 }));
      
      setModules(prev => prev.map((m) => 
        m.id === parentId ? { ...m, lessons: reorderedLessons } : m
      ));
      
      const updates = reorderedLessons.map((l) => ({ 
        id: l.id, 
        order_index: l.order_index,
        module_id: parentId,
        course_id: currentCourseId,
        title: l.title
      }));
      await supabase.from('lessons').upsert(updates);
    }
  };

  return (
    <div className={`space-y-10 transition-all duration-500 ${isFullScreen ? 'fixed inset-0 z-[100] bg-[#f8fafc] p-8 overflow-y-auto' : ''}`}>
      {/* Fullscreen Toggle Button - Floating or Header */}
      {isFullScreen && (
        <button 
          onClick={() => setIsFullScreen(false)}
          className="fixed top-8 right-8 z-[110] p-4 bg-white shadow-2xl border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-600 transition-all hover:scale-110 active:scale-95"
          title="Exit Fullscreen"
        >
          <X size={24} />
        </button>
      )}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
            <Settings size={14} />
            LMS Content Engine
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{mode === "global" ? "Course Curriculum" : "Batch Content Manager"}</h1>
          <p className="text-sm text-slate-500 font-medium">{mode === "global" ? "Design global course templates for all students." : "Manage specific content overrides for individual batches."}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          {mode === "global" ? (
            <div className="px-4 py-2 flex items-center gap-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select Course:</span>
              <select 
                value={selectedCourseId} 
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="bg-transparent text-sm font-black text-slate-900 outline-none cursor-pointer hover:text-blue-600 transition-colors"
              >
                {initialCourses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="px-4 py-2 flex items-center gap-3">
              <Filter size={14} className="text-slate-400" />
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Select Batch:</span>
              <select 
                value={selectedBatchId} 
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-transparent text-sm font-black text-slate-900 outline-none cursor-pointer hover:text-blue-600 transition-colors"
              >
                {availableBatches.map(batch => (
                  <option key={batch.id} value={batch.id}>{batch.batch_display}</option>
                ))}
              </select>
            </div>
          )}
          <div className="w-[1px] h-8 bg-slate-200 hidden md:block" />
          <button 
            onClick={() => {
              setModuleBatches(mode === "batch" ? [selectedBatchId].filter(Boolean) : []);
              setShowModuleForm(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
             <Plus size={14} /> Add Module
          </button>
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all shadow-sm active:scale-95"
            title={isFullScreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          >
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className={`grid grid-cols-1 gap-8 ${isFullScreen ? 'lg:grid-cols-1' : 'lg:grid-cols-12'}`}>
        
        {/* Module Sidebar Navigator */}
        {!isFullScreen && (
          <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden sticky top-24">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Module List</h3>
               <span className="px-2 py-0.5 bg-slate-200 text-[10px] font-black rounded-md">{modules.length}</span>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {modules.map((module, index) => (
                <button 
                  key={module.id} 
                  onClick={() => document.getElementById(module.id)?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full text-left px-3 py-3 hover:bg-blue-50/50 rounded-xl transition-all group flex items-start gap-3"
                >
                  <div className="w-5 h-5 shrink-0 rounded bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{module.title}</p>
                    {module.subtitle && <p className="text-[9px] text-slate-400 font-bold line-clamp-1">{module.subtitle}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{module.lessons?.length || 0} Topics</p>
                      {module.batch && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-[4px] text-[7px] font-black uppercase tracking-widest border border-blue-100">
                          {module.batch}
                        </span>
                      )}
                      {(module.batches || []).map((bId: string) => (
                        <Badge key={bId} variant="indigo" className="text-[7px]">
                          {availableBatches.find(b => b.id === bId)?.type || bId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 bg-slate-50/30">
               <button 
                onClick={() => {
                  setModuleBatches(mode === "batch" ? [selectedBatchId].filter(Boolean) : []);
                  setShowModuleForm(true);
                }}
                className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 hover:text-blue-600 transition-all rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2"
              >
                  <Plus size={14} /> New Section
               </button>
            </div>
          </div>
        </div>
      )}

        {/* Content Builder Area */}
        <div className={`${isFullScreen ? 'col-span-1' : 'lg:col-span-9'} space-y-12 pb-20`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="animate-spin text-blue-600" size={48} />
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Building Curriculum Tree...</p>
            </div>
          ) : modules.length === 0 ? (
            <div className="bg-slate-50 p-20 text-center rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 shadow-sm">
                 <PenTool size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">Your Curriculum is Empty</h3>
                <p className="text-slate-500 font-medium max-w-sm mx-auto text-sm leading-relaxed">
                  Start creating the course structure by adding your first module. You can then add lessons and materials inside it.
                </p>
              </div>
              <button 
                onClick={() => {
                  setModuleBatches(mode === "batch" ? [selectedBatchId].filter(Boolean) : []);
                  setShowModuleForm(true);
                }}
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all"
              >
                Create First Module
              </button>
            </div>
          ) : (
            modules.map((module, mIndex) => (
                <div 
                  key={module.id} 
                  id={module.id} 
                  className={`relative group scroll-mt-24 transition-all duration-300 ${draggedItem?.id === module.id ? 'opacity-40 scale-95' : 'opacity-100'}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, module.id, 'module')}
                  onDragEnd={onDragEnd}
                  onDragOver={onDragOver}
                  onDragEnter={(e) => handleDragEnter(e, module.id, 'module')}
                  onDrop={onDrop}
                >
                {/* Module Header Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative z-10 hover:border-blue-200 transition-all">
                  <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                     <div 
                        className="space-y-1 flex-1 cursor-pointer group/header"
                        onClick={() => toggleModule(module.id)}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical size={16} className="text-slate-300 cursor-grab active:cursor-grabbing" />
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded uppercase tracking-[0.2em]">Module {mIndex + 1}</span>
                          {module.batch && (
                            <span className="px-2 py-0.5 bg-white text-blue-600 border border-blue-200 text-[9px] font-black rounded uppercase tracking-[0.2em]">{module.batch}</span>
                          )}
                          <span className="w-1 h-1 bg-slate-300 rounded-full" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{module.lessons?.length || 0} Lessons</span>
                          <div className="flex gap-1">
                            {(module.batches || []).map((bId: string) => (
                              <Badge key={bId} variant="indigo">
                                {availableBatches.find(b => b.id === bId)?.type || bId}
                              </Badge>
                            ))}
                          </div>
                          <span className="ml-auto md:ml-0 text-slate-400 group-hover/header:text-blue-600 transition-colors">
                            {expandedModules.has(module.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                        </div>
                        <h2 className="text-lg font-black text-slate-900 group-hover/header:text-blue-600 transition-colors">{module.title}</h2>
                        {module.subtitle && <p className="text-xs font-medium text-slate-500">{module.subtitle}</p>}
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 mr-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); moveItem('module', module.id, 'up'); }}
                             className="p-1 hover:bg-slate-200 rounded-md transition-colors"
                             title="Move Up"
                           >
                             <ArrowUp size={12} className="text-slate-400" />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); moveItem('module', module.id, 'down'); }}
                             className="p-1 hover:bg-slate-200 rounded-md transition-colors"
                             title="Move Down"
                           >
                             <ArrowDown size={12} className="text-slate-400" />
                           </button>
                        </div>
                        <button 
                          onClick={() => {
                            setNewLesson({ 
                              title: "", 
                              subtitle: "",
                              type: "video", 
                              content_url: "",
                              html_content: "",
                              duration: "",
                              is_free: false,
                              is_locked: false,
                              order_index: module.lessons?.length || 0,
                              batches: mode === "batch" ? [selectedBatchId].filter(Boolean) : []
                            });
                            setLessonForm({ moduleId: module.id, show: true, isEditing: false });
                          }}
                          className="px-4 py-2 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm flex items-center gap-2"
                        >
                           <Plus size={14} /> Add Lesson
                        </button>
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer">
                           <DeleteButton id={module.id} table="lms_modules" title={module.title} onSuccess={() => fetchModulesAndLessons(currentCourseId, currentBatchName)} />
                        </div>
                     </div>
                  </div>

                  {/* Lessons List - Collapsible */}
                  {expandedModules.has(module.id) && (
                    <div className="p-4 border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-3">
                        {(module.lessons || []).length === 0 ? (
                          <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-3xl">
                             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No topics added to this module yet</p>
                          </div>
                        ) : (
                          [...(module.lessons || [])].sort((a,b) => a.order_index - b.order_index).map((lesson: any, lIndex: number) => (
                            <div 
                              key={lesson.id} 
                              className={`group/lesson flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 duration-200 ${draggedItem?.id === lesson.id ? 'opacity-40 bg-blue-50/50' : 'opacity-100'}`}
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); onDragStart(e, lesson.id, 'lesson', module.id); }}
                              onDragEnd={(e) => { e.stopPropagation(); onDragEnd(e); }}
                              onDragOver={(e) => { e.stopPropagation(); onDragOver(e); }}
                              onDragEnter={(e) => { e.stopPropagation(); handleDragEnter(e, lesson.id, 'lesson', module.id); }}
                              onDrop={(e) => { e.stopPropagation(); onDrop(e); }}
                            >
                               <GripVertical size={14} className="text-slate-200 group-hover/lesson:text-slate-400 cursor-grab active:cursor-grabbing shrink-0" />
                               <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-0.5">
                                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Part {lIndex + 1}</span>
                                     {lesson.duration && (
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                          • {lesson.duration} mins
                                       </span>
                                     )}
                                     {lesson.is_free && (
                                       <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 text-[9px] font-black rounded uppercase tracking-widest">
                                          Free Preview
                                       </span>
                                     )}
                                     {lesson.is_locked && (
                                       <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-black rounded uppercase tracking-widest">
                                          Locked
                                       </span>
                                     )}
                                     <div className="flex gap-1">
                                       {(lesson.batches || []).map((bId: string) => (
                                         <Badge key={bId} variant="blue" className="text-[7px]">
                                           {availableBatches.find(b => b.id === bId)?.type || bId}
                                         </Badge>
                                       ))}
                                     </div>
                                  </div>
                                  <h4 className="text-xs font-black text-slate-900 group-hover/lesson:text-blue-600 transition-colors">{lesson.title}</h4>
                                  {lesson.subtitle && <p className="text-[10px] text-slate-400 font-medium">{lesson.subtitle}</p>}
                               </div>
                               <div className="flex flex-col gap-0.5 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => moveItem('lesson', lesson.id, 'up', module.id)}
                                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                                  >
                                    <ArrowUp size={10} className="text-slate-400" />
                                  </button>
                                  <button 
                                    onClick={() => moveItem('lesson', lesson.id, 'down', module.id)}
                                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                                  >
                                    <ArrowDown size={10} className="text-slate-400" />
                                  </button>
                               </div>
                               <div className="flex items-center gap-1 opacity-0 group-hover/lesson:opacity-100 transition-opacity duration-300">
                                  <button 
                                    onClick={() => handleEditLesson(module, lesson)}
                                    className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 hover:scale-110 active:scale-90 shadow-sm"
                                    title="Edit Lesson"
                                  >
                                     <Edit2 size={14} />
                                  </button>
                                  <button 
                                    onClick={() => toggleLessonField(lesson.id, 'is_free', lesson.is_free)}
                                    className={`w-8 h-8 rounded-lg bg-white border flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 shadow-sm ${lesson.is_free ? 'text-green-600 border-green-200 hover:bg-green-50' : 'text-slate-400 border-slate-100 hover:text-blue-600 hover:bg-blue-50'}`}
                                    title={lesson.is_free ? "Remove Preview" : "Make Preview"}
                                  >
                                     <div className={`transition-transform duration-500 ${lesson.is_free ? 'rotate-0 scale-100' : 'rotate-180 scale-90'}`}>
                                       {lesson.is_free ? <Eye size={14} /> : <EyeOff size={14} />}
                                     </div>
                                  </button>
                                  <button 
                                    onClick={() => toggleLessonField(lesson.id, 'is_locked', lesson.is_locked)}
                                    className={`w-8 h-8 rounded-lg bg-white border flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 shadow-sm ${lesson.is_locked ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-slate-400 border-slate-100 hover:text-blue-600 hover:bg-blue-50'}`}
                                    title={lesson.is_locked ? "Unlock" : "Lock"}
                                  >
                                     <div className={`transition-transform duration-500 ${lesson.is_locked ? 'rotate-0 scale-100' : '-rotate-12 scale-90'}`}>
                                       {lesson.is_locked ? <Lock size={14} /> : <Unlock size={14} />}
                                     </div>
                                  </button>
                                  <a href={lesson.content_url} target="_blank" className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 hover:scale-110 active:scale-90 shadow-sm" title="External Link">
                                     <ExternalLink size={14} />
                                  </a>
                                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer shadow-sm">
                                     <DeleteButton 
                                       id={lesson.id} 
                                       table="lessons" 
                                       title={lesson.title} 
                                       onSuccess={() => fetchModulesAndLessons(currentCourseId, currentBatchName)} 
                                     />
                                  </div>
                               </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Decorative connecting line */}
                <div className="absolute left-1/2 -bottom-12 w-[2px] h-12 bg-slate-100 group-last:hidden" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals - Improved Visibility */}
      {showModuleForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] overflow-y-auto p-4 animate-in fade-in duration-300">
          <div className="min-h-full flex items-center justify-center py-8">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900">New Module</h3>
              <button onClick={() => setShowModuleForm(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-all"><X size={18} className="text-slate-900" /></button>
            </div>
            <form onSubmit={handleAddModule} className="p-6 space-y-4">
              <div className="space-y-2 group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Module Title</label>
                <input 
                  autoFocus required type="text" value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="e.g. Fundamental Concepts" 
                  className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-lg placeholder:text-slate-300" 
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Module Subtitle</label>
                <input 
                  type="text" value={newModuleSubtitle}
                  onChange={(e) => setNewModuleSubtitle(e.target.value)}
                  placeholder="e.g. Master the core principles" 
                  className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-bold text-slate-700 text-sm placeholder:text-slate-300" 
                />
              </div>
              <div className="space-y-2">
                <MultiSelect 
                  label="Assign to Batches"
                  options={availableBatches.map(b => ({ value: b.id, label: b.batch_display }))}
                  selected={moduleBatches}
                  onChange={setModuleBatches}
                  placeholder="Select batches..."
                />
              </div>
              <button 
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                Create Module Section
              </button>
            </form>
          </div>
        </div>
      </div>
    )}

      {lessonForm.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] overflow-y-auto p-4 animate-in fade-in duration-300">
          <div className="min-h-full flex items-center justify-center py-8">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900">{lessonForm.isEditing ? 'Edit Lesson' : 'Add Lesson Content'}</h3>
              <button onClick={() => setLessonForm({ moduleId: "", show: false, isEditing: false })} className="p-2 hover:bg-slate-200 rounded-lg transition-all"><X size={18} className="text-slate-900" /></button>
            </div>
            <form onSubmit={handleAddLesson} className="p-6 space-y-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Lesson Title</label>
                <input 
                  autoFocus required type="text" value={newLesson.title}
                  onChange={(e) => setNewLesson({...newLesson, title: e.target.value})}
                  placeholder="e.g. Getting Started with Tools" 
                  className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-lg placeholder:text-slate-300" 
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Subtitle</label>
                <input 
                  type="text" value={newLesson.subtitle}
                  onChange={(e) => setNewLesson({...newLesson, subtitle: e.target.value})}
                  placeholder="e.g. Learn the basics of the environment" 
                  className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-bold text-slate-700 text-sm placeholder:text-slate-300" 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Content Type</label>
                  <select 
                    value={newLesson.type}
                    onChange={(e) => setNewLesson({...newLesson, type: e.target.value})}
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-sm"
                  >
                    <option value="video">Video (YouTube/Vimeo)</option>
                    <option value="article">Article / HTML Content</option>
                    <option value="document">PDF / Document</option>
                  </select>
                </div>
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Duration (Minutes)</label>
                  <input 
                    type="text" value={newLesson.duration}
                    onChange={(e) => setNewLesson({...newLesson, duration: e.target.value})}
                    placeholder="e.g. 15" 
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-sm" 
                  />
                </div>
              </div>

              {newLesson.type === 'video' && (
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">YouTube / Video URL</label>
                  <div className="flex items-center gap-3 border-b-2 border-slate-100 focus-within:border-blue-600 transition-all">
                    <Video size={18} className="text-slate-400" />
                    <input 
                      type="url" value={newLesson.content_url}
                      onChange={(e) => setNewLesson({...newLesson, content_url: e.target.value})}
                      placeholder="https://youtube.com/watch?v=..." 
                      className="w-full py-3 bg-transparent outline-none font-medium text-slate-700 text-sm" 
                    />
                  </div>
                </div>
              )}

              {newLesson.type === 'article' && (
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">HTML / Text Content</label>
                  <textarea 
                    rows={12}
                    value={newLesson.html_content}
                    onChange={(e) => setNewLesson({...newLesson, html_content: e.target.value})}
                    placeholder="Paste your HTML code or write text here..." 
                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-blue-600 outline-none transition-all font-mono text-sm" 
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Display Order</label>
                  <input 
                    type="number" value={newLesson.order_index}
                    onChange={(e) => setNewLesson({...newLesson, order_index: parseInt(e.target.value) || 0})}
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <MultiSelect 
                  label="Assign to Batches"
                  options={availableBatches.map(b => ({ value: b.id, label: b.batch_display }))}
                  selected={newLesson.batches}
                  onChange={(selected) => setNewLesson({...newLesson, batches: selected})}
                  placeholder="Select batches..."
                />
              </div>

              <div className="flex items-center gap-8">
                <label className="flex items-center gap-3 cursor-pointer group/check">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={newLesson.is_free}
                      onChange={(e) => setNewLesson({...newLesson, is_free: e.target.checked})}
                      className="peer sr-only"
                    />
                    <div className="w-12 h-6 bg-slate-200 rounded-full peer-checked:bg-green-600 transition-all shadow-inner" />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6 shadow-sm" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/check:text-slate-900">Free Preview</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group/check">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={newLesson.is_locked}
                      onChange={(e) => setNewLesson({...newLesson, is_locked: e.target.checked})}
                      className="peer sr-only"
                    />
                    <div className="w-12 h-6 bg-slate-200 rounded-full peer-checked:bg-amber-600 transition-all shadow-inner" />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6 shadow-sm" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/check:text-slate-900">Lock Lesson</span>
                </label>
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (lessonForm.isEditing ? <Check size={18} /> : <Plus size={18} />)}
                {lessonForm.isEditing ? 'Save Changes' : 'Add Content to Module'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
