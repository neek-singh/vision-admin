"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Search, 
  Settings,
  ChevronDown,
  ChevronUp,
  Filter,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
  Loader2,
  X,
  PenTool,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ExternalLink,
  BookOpen,
  Copy
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DeleteButton from "@/components/admin/DeleteButton";
import Badge from "@/components/ui/Badge";
import dynamic from "next/dynamic";

const ModuleFormModal = dynamic(() => import("@/components/admin/lms/ModuleFormModal"), { ssr: false });
const LessonFormModal = dynamic(() => import("@/components/admin/lms/LessonFormModal"), { ssr: false });

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

  // Modal Control States
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [lessonModal, setLessonModal] = useState<{
    show: boolean, 
    moduleId: string, 
    isEditing: boolean, 
    lessonId?: string, 
    initialData?: any
  }>({ show: false, moduleId: "", isEditing: false });
  const [copyToCourseModal, setCopyToCourseModal] = useState<{ show: boolean, module: any } | null>(null);
  const [targetCourseId, setTargetCourseId] = useState<string>("");

  const selectedBatchObj = useMemo(() => availableBatches.find(b => b.id === selectedBatchId), [availableBatches, selectedBatchId]);
  const currentCourseId = mode === "batch" ? (selectedBatchObj?.course_id || "") : selectedCourseId;
  const currentBatchName = mode === "batch" ? (selectedBatchObj?.type || null) : null;

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

  const handleRefresh = () => {
    setShowModuleModal(false);
    setLessonModal({ show: false, moduleId: "", isEditing: false });
    fetchModulesAndLessons(currentCourseId, currentBatchName);
    router.refresh();
  };

  const toggleLessonField = async (lessonId: string, field: string, currentValue: boolean) => {
    setModules(prev => prev.map(m => ({
      ...m,
      lessons: m.lessons?.map((l: any) => l.id === lessonId ? { ...l, [field]: !currentValue } : l)
    })));

    try {
      const { error } = await supabase
        .from("lessons")
        .update({ [field]: !currentValue })
        .eq("id", lessonId);
      
      if (error) throw error;
    } catch (err) {
      console.error(`Error toggling ${field}:`, err);
      fetchModulesAndLessons(currentCourseId, currentBatchName);
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

  // Drag and Drop
  const onDragStart = (e: React.DragEvent, id: string, type: 'module' | 'lesson', parentId?: string) => {
    setDraggedItem({ id, type, parentId });
    e.dataTransfer.setData("text/plain", id);
  };

  const onDragEnd = async (e: React.DragEvent) => {
    if (draggedItem) {
      try {
        if (draggedItem.type === 'module') {
          const updates = modules.map((m, idx) => ({ 
            id: m.id, 
            order_index: idx + 1,
            course_id: currentCourseId,
            title: m.title
          }));
          await supabase.from('lms_modules').upsert(updates);
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
            await supabase.from('lessons').upsert(updates);
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
        return newModules.map((m, idx) => ({ ...m, order_index: idx + 1 }));
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
        
        const reorderedLessons = moduleLessons.map((l, idx) => ({ ...l, order_index: idx + 1 }));
        return prev.map((m) => m.id === targetParentId ? { ...m, lessons: reorderedLessons } : m);
      }
    });
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
      await supabase.from('lms_modules').upsert(reorderedModules.map(m => ({ id: m.id, order_index: m.order_index, course_id: currentCourseId, title: m.title })));
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
      setModules(prev => prev.map(m => m.id === parentId ? { ...m, lessons: reorderedLessons } : m));
      await supabase.from('lessons').upsert(reorderedLessons.map(l => ({ id: l.id, order_index: l.order_index, module_id: parentId, course_id: currentCourseId, title: l.title })));
    }
  };

  const duplicateModule = async (module: any, targetId: string = currentCourseId) => {
    if (!confirm(`Are you sure you want to duplicate "${module.title}"? All lessons will be copied too.`)) return;
    
    setLoading(true);
    try {
      // If target course is different, fetch current module count there
      let newOrderIndex = modules.length + 1;
      if (targetId !== currentCourseId) {
        const { count, error: countError } = await supabase
          .from("lms_modules")
          .select('*', { count: 'exact', head: true })
          .eq("course_id", targetId);
        
        if (countError) throw countError;
        newOrderIndex = (count || 0) + 1;
      }

      // 1. Create new module
      const newModuleData = {
        course_id: targetId,
        title: `${module.title} (Copy)`,
        subtitle: module.subtitle,
        batch: module.batch,
        batches: module.batches,
        order_index: newOrderIndex
      };

      const { data: newModule, error: moduleError } = await supabase
        .from("lms_modules")
        .insert(newModuleData)
        .select()
        .single();

      if (moduleError) throw moduleError;

      // 2. Create new lessons for this module
      if (module.lessons && module.lessons.length > 0) {
        const newLessonsData = module.lessons.map((lesson: any) => ({
          module_id: newModule.id,
          course_id: targetId,
          title: lesson.title,
          subtitle: lesson.subtitle,
          type: 'video',
          lesson_type: lesson.lesson_type || lesson.type,
          content_url: lesson.content_url,
          notes_content: lesson.notes_content,
          duration: lesson.duration,
          is_free: lesson.is_free,
          is_locked: lesson.is_locked,
          order_index: lesson.order_index,
          batches: lesson.batches
        }));

        const { error: lessonsError } = await supabase
          .from("lessons")
          .insert(newLessonsData);

        if (lessonsError) throw lessonsError;
      }

      if (targetId === currentCourseId) {
        handleRefresh();
      }
      
      alert(`Module duplicated successfully to ${initialCourses.find(c => c.id === targetId)?.title || 'target course'}!`);
      setCopyToCourseModal(null);
    } catch (err) {
      console.error("Error duplicating module:", err);
      alert("Error duplicating module: " + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-10 transition-all duration-500 ${isFullScreen ? 'fixed inset-0 z-[100] bg-[#f8fafc] p-8 overflow-y-auto' : ''}`}>
      
      {/* Lazy Modals */}
      {showModuleModal && (
        <ModuleFormModal 
          courseId={currentCourseId}
          batchName={currentBatchName}
          mode={mode}
          availableBatches={availableBatches}
          onClose={() => setShowModuleModal(false)}
          onSuccess={handleRefresh}
          currentModulesCount={modules.length}
        />
      )}

      {lessonModal.show && (
        <LessonFormModal 
          courseId={currentCourseId}
          moduleId={lessonModal.moduleId}
          isEditing={lessonModal.isEditing}
          lessonId={lessonModal.lessonId}
          initialData={lessonModal.initialData}
          availableBatches={availableBatches}
          onClose={() => setLessonModal({ show: false, moduleId: "", isEditing: false })}
          onSuccess={handleRefresh}
        />
      )}

      {copyToCourseModal?.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-black text-slate-900">Copy to Course</h3>
                <button onClick={() => setCopyToCourseModal(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-all"><X size={18} className="text-slate-900" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 font-medium">Select the course where you want to copy <span className="font-black text-slate-900">"{copyToCourseModal.module.title}"</span>:</p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Target Course</label>
                    <select 
                      value={targetCourseId}
                      onChange={(e) => setTargetCourseId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-black text-black"
                    >
                      {initialCourses.map(course => (
                        <option key={course.id} value={course.id}>{course.title} {course.id === currentCourseId ? "(Current)" : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                   <button 
                    onClick={() => setCopyToCourseModal(null)}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => duplicateModule(copyToCourseModal.module, targetCourseId)}
                    disabled={loading}
                    className="flex-[2] py-4 bg-slate-900 hover:bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : "Copy Module"}
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

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
            onClick={() => setShowModuleModal(true)}
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
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{module.lessons?.length || 0} Topics</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-3 bg-slate-50/30">
                 <button 
                  onClick={() => setShowModuleModal(true)}
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
              <h3 className="text-xl font-black text-slate-900">Your Curriculum is Empty</h3>
              <button 
                onClick={() => setShowModuleModal(true)}
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100"
              >
                Create First Module
              </button>
            </div>
          ) : (
            modules.map((module, mIndex) => (
              <div 
                key={module.id} 
                id={module.id} 
                className="relative group scroll-mt-24 transition-all duration-300"
                draggable
                onDragStart={(e) => onDragStart(e, module.id, 'module')}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => handleDragEnter(e, module.id, 'module')}
              >
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative z-10 hover:border-blue-200 transition-all">
                  <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                     <div 
                        className="space-y-1 flex-1 cursor-pointer"
                        onClick={() => toggleModule(module.id)}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical size={16} className="text-slate-300 cursor-grab active:cursor-grabbing" />
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded uppercase tracking-[0.2em]">Module {mIndex + 1}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{module.lessons?.length || 0} Lessons</span>
                          <span className="ml-auto md:ml-0 text-slate-400">
                            {expandedModules.has(module.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                        </div>
                        <h2 className="text-lg font-black text-slate-900 line-clamp-1">{module.title}</h2>
                        {module.subtitle && <p className="text-xs font-medium text-slate-500">{module.subtitle}</p>}
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 mr-2">
                           <button onClick={(e) => { e.stopPropagation(); moveItem('module', module.id, 'up'); }} className="p-1 hover:bg-slate-200 rounded-md transition-colors"><ArrowUp size={12} className="text-slate-400" /></button>
                           <button onClick={(e) => { e.stopPropagation(); moveItem('module', module.id, 'down'); }} className="p-1 hover:bg-slate-200 rounded-md transition-colors"><ArrowDown size={12} className="text-slate-400" /></button>
                        </div>
                        <button 
                          onClick={() => setLessonModal({ show: true, moduleId: module.id, isEditing: false })}
                          className="px-4 py-2 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm flex items-center gap-2"
                        >
                           <Plus size={14} /> Add Lesson
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCopyToCourseModal({ show: true, module }); setTargetCourseId(currentCourseId); }}
                          className="p-2 bg-white hover:bg-blue-50 border border-slate-200 text-slate-400 hover:text-blue-600 rounded-lg transition-all shadow-sm"
                          title="Copy to Course"
                        >
                           <Copy size={14} />
                        </button>
                        <DeleteButton id={module.id} table="lms_modules" title={module.title} onSuccess={handleRefresh} />
                     </div>
                  </div>

                  {expandedModules.has(module.id) && (
                    <div className="p-4 border-t border-slate-50 animate-in slide-in-from-top-2">
                      <div className="space-y-3">
                        {(module.lessons || []).length === 0 ? (
                          <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-3xl">
                             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No topics added to this module yet</p>
                          </div>
                        ) : (
                          [...(module.lessons || [])].sort((a,b) => a.order_index - b.order_index).map((lesson: any, lIndex: number) => (
                            <div 
                              key={lesson.id} 
                              className="group/lesson flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); onDragStart(e, lesson.id, 'lesson', module.id); }}
                              onDragEnd={(e) => { e.stopPropagation(); onDragEnd(e); }}
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnter={(e) => { e.stopPropagation(); handleDragEnter(e, lesson.id, 'lesson', module.id); }}
                            >
                               <GripVertical size={14} className="text-slate-200 group-hover/lesson:text-slate-400 cursor-grab shrink-0" />
                               <div className="flex-1">
                                  <h4 className="text-xs font-black text-slate-900">{lesson.title}</h4>
                                  <p className="text-[10px] text-slate-400 font-medium">{lesson.subtitle}</p>
                               </div>
                               <div className="flex items-center gap-1 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                                  <button onClick={() => setLessonModal({ show: true, moduleId: module.id, isEditing: true, lessonId: lesson.id, initialData: lesson })} className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm"><Edit2 size={14} /></button>
                                  <button onClick={() => toggleLessonField(lesson.id, 'is_free', lesson.is_free)} className={`w-8 h-8 rounded-lg bg-white border flex items-center justify-center transition-all shadow-sm ${lesson.is_free ? 'text-green-600 border-green-200' : 'text-slate-400 border-slate-100'}`}>{lesson.is_free ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                                  <button onClick={() => toggleLessonField(lesson.id, 'is_locked', lesson.is_locked)} className={`w-8 h-8 rounded-lg bg-white border flex items-center justify-center transition-all shadow-sm ${lesson.is_locked ? 'text-amber-600 border-amber-200' : 'text-slate-400 border-slate-100'}`}>{lesson.is_locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                                  <a href={lesson.content_url} target="_blank" className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-sm"><ExternalLink size={14} /></a>
                                  <DeleteButton id={lesson.id} table="lessons" title={lesson.title} onSuccess={handleRefresh} />
                               </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="absolute left-1/2 -bottom-12 w-[2px] h-12 bg-slate-100 group-last:hidden" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
