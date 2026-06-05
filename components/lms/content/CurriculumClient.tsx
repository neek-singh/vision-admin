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
  BookOpen,
  Copy,
  Layout,
  FolderPlus,
  Eye
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DeleteButton from "@/components/ui/DeleteButton";
import Badge from "@/components/ui/Badge";
import dynamic from "next/dynamic";

const ModuleFormModal = dynamic(() => import("@/components/lms/admin/ModuleFormModal"), { ssr: false });
const ChapterFormModal = dynamic(() => import("@/components/lms/admin/ChapterFormModal"), { ssr: false });
const LessonFormModal = dynamic(() => import("@/components/lms/admin/LessonFormModal"), { ssr: false });
const LessonPreviewModal = dynamic(() => import("@/components/lms/admin/LessonPreviewModal"), { ssr: false });

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
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'module' | 'chapter' | 'lesson', parentId?: string } | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<any>(null);

  // Modal Control States
  const [moduleModal, setModuleModal] = useState<{
    show: boolean,
    isEditing: boolean,
    moduleId?: string,
    initialData?: any
  }>({ show: false, isEditing: false });
  const [chapterModal, setChapterModal] = useState<{
    show: boolean,
    isEditing: boolean,
    moduleId: string,
    chapterId?: string,
    initialData?: any,
    currentChaptersCount?: number
  }>({ show: false, isEditing: false, moduleId: "" });
  const [lessonModal, setLessonModal] = useState<{
    show: boolean, 
    moduleId: string, 
    chapterId?: string,
    isEditing: boolean, 
    lessonId?: string, 
    initialData?: any,
    currentLessonsCount?: number
  }>({ show: false, moduleId: "", isEditing: false, currentLessonsCount: 0 });
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
        lms_chapters(
          *,
          lessons(*)
        ),
        lessons(*)
      `)
      .eq("course_id", courseId);
    
    if (mode === "global") {
      query = query.is("batch", null);
    }

    try {
      const { data: modulesData, error } = await query.order("order_index");
      if (error) throw error;
      
      // Clean up the data: module.lessons currently contains ALL lessons for that module
      // due to the Supabase query. We only want it to contain lessons NOT in any chapter (uncategorized).
      const cleanedModules = (modulesData || []).map(mod => ({
        ...mod,
        lessons: mod.lessons?.filter((l: any) => !l.chapter_id) || []
      }));
      
      setModules(cleanedModules);
    } catch (err) {
      console.error("Error fetching curriculum:", err);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = () => {
    setModuleModal({ show: false, isEditing: false });
    setChapterModal({ show: false, isEditing: false, moduleId: "" });
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

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Drag and Drop
  const onDragStart = (e: React.DragEvent, id: string, type: 'module' | 'chapter' | 'lesson', parentId?: string) => {
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
        } else if (draggedItem.type === 'chapter') {
          const moduleIndex = modules.findIndex(m => m.id === draggedItem.parentId);
          if (moduleIndex !== -1) {
            const chapters = modules[moduleIndex].lms_chapters || [];
            const updates = chapters.map((c: any, idx: number) => ({
              id: c.id,
              order_index: idx + 1,
              module_id: draggedItem.parentId,
              course_id: currentCourseId,
              title: c.title
            }));
            await supabase.from('lms_chapters').upsert(updates);
          }
        } else {
          // Lesson movement
          // Find if it's in a chapter or direct module
          let lessonUpdates: any[] = [];
          let table = 'lessons';
          
          const moduleWithDirectLesson = modules.find(m => m.id === draggedItem.parentId);
          if (moduleWithDirectLesson) {
            const lessons = moduleWithDirectLesson.lessons?.filter((l: any) => !l.chapter_id) || [];
            lessonUpdates = lessons.map((l: any, idx: number) => ({ 
              id: l.id, 
              order_index: idx + 1,
              module_id: draggedItem.parentId,
              chapter_id: null,
              course_id: currentCourseId,
              title: l.title
            }));
          } else {
            // Check in chapters
            for (const mod of modules) {
              const chapter = mod.lms_chapters?.find((c: any) => c.id === draggedItem.parentId);
              if (chapter) {
                const lessons = chapter.lessons || [];
                lessonUpdates = lessons.map((l: any, idx: number) => ({ 
                  id: l.id, 
                  order_index: idx + 1,
                  module_id: mod.id,
                  chapter_id: chapter.id,
                  course_id: currentCourseId,
                  title: l.title
                }));
                break;
              }
            }
          }
          
          if (lessonUpdates.length > 0) {
            await supabase.from('lessons').upsert(lessonUpdates);
          }
        }
      } catch (err) {
        console.error("Error syncing drag order:", err);
      }
    }
    setDraggedItem(null);
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string, type: 'module' | 'chapter' | 'lesson', targetParentId?: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetId) return;
    
    // For modules and chapters, we only allow reordering within the same parent
    if (draggedItem.type !== 'lesson' && draggedItem.type !== type) return;
    if (draggedItem.type !== 'lesson' && draggedItem.parentId !== targetParentId) return;

    setModules(prev => {
      if (draggedItem.type === 'module') {
        const oldIndex = prev.findIndex(m => m.id === draggedItem.id);
        const newIndex = prev.findIndex(m => m.id === targetId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;

        const newModules = [...prev];
        const [removed] = newModules.splice(oldIndex, 1);
        newModules.splice(newIndex, 0, removed);
        return newModules.map((m, idx) => ({ ...m, order_index: idx + 1 }));
      } else if (draggedItem.type === 'chapter') {
        const moduleIndex = prev.findIndex(m => m.id === targetParentId);
        if (moduleIndex === -1) return prev;
        
        const chapters = [...(prev[moduleIndex].lms_chapters || [])];
        const oldIndex = chapters.findIndex(c => c.id === draggedItem.id);
        const newIndex = chapters.findIndex(c => c.id === targetId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;

        const [removed] = chapters.splice(oldIndex, 1);
        chapters.splice(newIndex, 0, removed);
        
        const reorderedChapters = chapters.map((c, idx) => ({ ...c, order_index: idx + 1 }));
        return prev.map((m) => m.id === targetParentId ? { ...m, lms_chapters: reorderedChapters } : m);
      } else {
        // LESSON MOVEMENT
        let newModules = JSON.parse(JSON.stringify(prev));
        let lessonToMove: any = null;

        // 1. Find and remove lesson from source
        for (let mIdx = 0; mIdx < newModules.length; mIdx++) {
          const dIdx = (newModules[mIdx].lessons || []).findIndex((l: any) => l.id === draggedItem.id);
          if (dIdx !== -1) {
            [lessonToMove] = newModules[mIdx].lessons.splice(dIdx, 1);
            break;
          }
          for (let cIdx = 0; cIdx < (newModules[mIdx].lms_chapters || []).length; cIdx++) {
            const lIdx = (newModules[mIdx].lms_chapters[cIdx].lessons || []).findIndex((l: any) => l.id === draggedItem.id);
            if (lIdx !== -1) {
              [lessonToMove] = newModules[mIdx].lms_chapters[cIdx].lessons.splice(lIdx, 1);
              break;
            }
          }
          if (lessonToMove) break;
        }

        if (!lessonToMove) return prev;

        // 2. Determine target list and position
        let targetParent = targetParentId;
        let targetType = type;
        
        // If dropping a lesson on a module/chapter header, that IS the target parent
        if (targetType === 'module' || targetType === 'chapter') {
          targetParent = targetId;
        }

        let targetInserted = false;
        const targetModIdx = newModules.findIndex((m: any) => m.id === targetParent);
        
        if (targetModIdx !== -1) {
          // Target is a Module (direct lessons)
          const targetLessons = newModules[targetModIdx].lessons || [];
          const targetIdx = targetLessons.findIndex((l: any) => l.id === targetId);
          if (targetIdx !== -1) {
            targetLessons.splice(targetIdx, 0, lessonToMove);
          } else {
            targetLessons.push(lessonToMove);
          }
          newModules[targetModIdx].lessons = targetLessons;
          targetInserted = true;
        } else {
          // Target might be a Chapter
          for (let mIdx = 0; mIdx < newModules.length; mIdx++) {
            const targetChapIdx = (newModules[mIdx].lms_chapters || []).findIndex((c: any) => c.id === targetParent);
            if (targetChapIdx !== -1) {
              const targetLessons = newModules[mIdx].lms_chapters[targetChapIdx].lessons || [];
              const targetIdx = targetLessons.findIndex((l: any) => l.id === targetId);
              if (targetIdx !== -1) {
                targetLessons.splice(targetIdx, 0, lessonToMove);
              } else {
                targetLessons.push(lessonToMove);
              }
              newModules[mIdx].lms_chapters[targetChapIdx].lessons = targetLessons;
              targetInserted = true;
              break;
            }
          }
        }

        if (targetInserted) {
          setDraggedItem(prevDrag => prevDrag ? { ...prevDrag, parentId: targetParent } : null);
          return newModules;
        }

        return prev;
      }
    });
  };

  const moveItem = async (type: 'module' | 'chapter' | 'lesson', id: string, direction: 'up' | 'down', parentId?: string) => {
    if (type === 'module') {
      const index = modules.findIndex(m => m.id === id);
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === modules.length - 1) return;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const newModules = [...modules];
      const [removed] = newModules.splice(index, 1);
      newModules.splice(newIndex, 0, removed);
      
      const reorderedModules = newModules.map((m: any, idx: number) => ({ ...m, order_index: idx + 1 }));
      setModules(reorderedModules);
      await supabase.from('lms_modules').upsert(reorderedModules.map((m: any) => ({ id: m.id, order_index: m.order_index, course_id: currentCourseId, title: m.title })));
    } else if (type === 'chapter') {
      const moduleIndex = modules.findIndex(m => m.id === parentId);
      if (moduleIndex === -1) return;
      const chapters = [...(modules[moduleIndex].lms_chapters || [])].sort((a, b) => a.order_index - b.order_index);
      const index = chapters.findIndex(c => c.id === id);
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === chapters.length - 1) return;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const [removed] = chapters.splice(index, 1);
      chapters.splice(newIndex, 0, removed);

      const reorderedChapters = chapters.map((c: any, idx: number) => ({ ...c, order_index: idx + 1 }));
      setModules(prev => prev.map((m: any) => m.id === parentId ? { ...m, lms_chapters: reorderedChapters } : m));
      await supabase.from('lms_chapters').upsert(reorderedChapters.map((c: any) => ({ id: c.id, order_index: c.order_index, module_id: parentId, course_id: currentCourseId, title: c.title })));
    } else {
      // Find where the lesson is (direct or in chapter)
      let moduleIndex = modules.findIndex(m => m.id === parentId);
      let chapterIndex = -1;
      let lessons: any[] = [];
      
      if (moduleIndex !== -1) {
        lessons = [...(modules[moduleIndex].lessons || [])].filter(l => !l.chapter_id).sort((a, b) => a.order_index - b.order_index);
      } else {
        // Search in chapters
        for (let mIdx = 0; mIdx < modules.length; mIdx++) {
          const cIdx = modules[mIdx].lms_chapters?.findIndex((c: any) => c.id === parentId);
          if (cIdx !== -1 && cIdx !== undefined) {
            moduleIndex = mIdx;
            chapterIndex = cIdx;
            lessons = [...(modules[mIdx].lms_chapters[chapterIndex].lessons || [])].sort((a, b) => a.order_index - b.order_index);
            break;
          }
        }
      }

      if (moduleIndex === -1 || lessons.length === 0) return;
      
      const index = lessons.findIndex(l => l.id === id);
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === lessons.length - 1) return;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      const [removed] = lessons.splice(index, 1);
      lessons.splice(newIndex, 0, removed);
      
      const reorderedLessons = lessons.map((l: any, idx: number) => ({ ...l, order_index: idx + 1 }));
      
      if (chapterIndex === -1) {
        // Update module direct lessons
        const otherLessons = (modules[moduleIndex].lessons || []).filter((l: any) => l.chapter_id);
        setModules(prev => prev.map((m: any) => m.id === parentId ? { ...m, lessons: [...reorderedLessons, ...otherLessons] } : m));
        await supabase.from('lessons').upsert(reorderedLessons.map((l: any) => ({ id: l.id, order_index: l.order_index, module_id: parentId, chapter_id: null, course_id: currentCourseId, title: l.title })));
      } else {
        // Update chapter lessons
        setModules(prev => {
          const newModules = [...prev];
          newModules[moduleIndex].lms_chapters[chapterIndex].lessons = reorderedLessons;
          return newModules;
        });
        await supabase.from('lessons').upsert(reorderedLessons.map((l: any) => ({ id: l.id, order_index: l.order_index, module_id: modules[moduleIndex].id, chapter_id: parentId, course_id: currentCourseId, title: l.title })));
      }
    }
  };

  const duplicateModule = async (module: any, targetId: string = currentCourseId) => {
    if (!confirm(`Are you sure you want to duplicate "${module.title}"? All chapters and lessons will be copied too.`)) return;
    
    setLoading(true);
    try {
      // Fetch current module count in target course
      const { count, error: countError } = await supabase
        .from("lms_modules")
        .select('*', { count: 'exact', head: true })
        .eq("course_id", targetId);
      
      if (countError) throw countError;
      const newOrderIndex = (count || 0) + 1;

      // 1. Create new module
      const newModuleData = {
        course_id: targetId,
        title: `${module.title} (Copy)`,
        subtitle: null,
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

      // 2. Duplicate Chapters and their lessons
      if (module.lms_chapters && module.lms_chapters.length > 0) {
        for (const chapter of module.lms_chapters) {
          const { data: newChapter, error: chapterError } = await supabase
            .from("lms_chapters")
            .insert({
              module_id: newModule.id,
              course_id: targetId,
              title: chapter.title,
              order_index: chapter.order_index
            })
            .select()
            .single();

          if (chapterError) throw chapterError;

          if (chapter.lessons && chapter.lessons.length > 0) {
            const newLessonsData = chapter.lessons.map((lesson: any) => ({
              module_id: newModule.id,
              chapter_id: newChapter.id,
              course_id: targetId,
              title: lesson.title,
              subtitle: null,
              type: 'video',
              lesson_type: lesson.lesson_type || lesson.type,
              content_url: lesson.content_url,
              notes_content: lesson.notes_content,
              duration: null,
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
        }
      }

      // 3. Duplicate uncategorized lessons
      const uncategorizedLessons = module.lessons?.filter((l: any) => !l.chapter_id) || [];
      if (uncategorizedLessons.length > 0) {
        const newLessonsData = uncategorizedLessons.map((lesson: any) => ({
          module_id: newModule.id,
          chapter_id: null,
          course_id: targetId,
          title: lesson.title,
          subtitle: null,
          type: 'video',
          lesson_type: lesson.lesson_type || lesson.type,
          content_url: lesson.content_url,
          notes_content: lesson.notes_content,
          duration: null,
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
      {moduleModal.show && (
        <ModuleFormModal 
          courseId={currentCourseId}
          batchName={currentBatchName}
          mode={mode}
          availableBatches={availableBatches}
          isEditing={moduleModal.isEditing}
          moduleId={moduleModal.moduleId}
          initialData={moduleModal.initialData}
          onClose={() => setModuleModal({ show: false, isEditing: false })}
          onSuccess={handleRefresh}
          currentModulesCount={modules.length}
        />
      )}

      {lessonModal.show && (
        <LessonFormModal 
          courseId={currentCourseId}
          moduleId={lessonModal.moduleId}
          chapterId={lessonModal.chapterId}
          isEditing={lessonModal.isEditing}
          lessonId={lessonModal.lessonId}
          initialData={lessonModal.initialData}
          availableBatches={availableBatches}
          onClose={() => setLessonModal({ show: false, moduleId: "", isEditing: false, currentLessonsCount: 0 })}
          onSuccess={handleRefresh}
          currentLessonsCount={lessonModal.currentLessonsCount || 0}
        />
      )}

      {chapterModal.show && (
        <ChapterFormModal 
          courseId={currentCourseId}
          moduleId={chapterModal.moduleId}
          isEditing={chapterModal.isEditing}
          chapterId={chapterModal.chapterId}
          initialData={chapterModal.initialData}
          onClose={() => setChapterModal({ show: false, isEditing: false, moduleId: "" })}
          onSuccess={handleRefresh}
          currentChaptersCount={chapterModal.currentChaptersCount || 0}
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

      {previewLesson && (
        <LessonPreviewModal 
          lesson={previewLesson} 
          onClose={() => setPreviewLesson(null)} 
        />
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
            onClick={() => setModuleModal({ show: true, isEditing: false })}
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
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{module.lessons?.length || 0} Classes</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-3 bg-slate-50/30">
                 <button 
                  onClick={() => setModuleModal({ show: true, isEditing: false })}
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
                onClick={() => setModuleModal({ show: true, isEditing: false })}
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
                     </div>
                     <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 mr-2">
                           <button onClick={(e) => { e.stopPropagation(); moveItem('module', module.id, 'up'); }} className="p-1 hover:bg-slate-200 rounded-md transition-colors"><ArrowUp size={12} className="text-slate-400" /></button>
                           <button onClick={(e) => { e.stopPropagation(); moveItem('module', module.id, 'down'); }} className="p-1 hover:bg-slate-200 rounded-md transition-colors"><ArrowDown size={12} className="text-slate-400" /></button>
                        </div>
                         <button 
                          onClick={() => setChapterModal({ show: true, moduleId: module.id, isEditing: false, currentChaptersCount: (module.lms_chapters?.length || 0) })}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2"
                        >
                           <FolderPlus size={14} /> Add Chapter
                        </button>
                        <button 
                          onClick={() => setLessonModal({ show: true, moduleId: module.id, isEditing: false, currentLessonsCount: (module.lessons?.length || 0) })}
                          className="px-4 py-2 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm flex items-center gap-2"
                        >
                           <Plus size={14} /> Add Lesson
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setModuleModal({ show: true, isEditing: true, moduleId: module.id, initialData: module }); }}
                          className="p-2 bg-white hover:bg-blue-50 border border-slate-200 text-slate-400 hover:text-blue-600 rounded-lg transition-all shadow-sm"
                          title="Edit Module Name"
                        >
                           <Edit2 size={14} />
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
                    <div className="p-4 border-t border-slate-50 animate-in slide-in-from-top-2 space-y-8">
                      
                      {/* Chapters Area */}
                      {module.lms_chapters && module.lms_chapters.length > 0 && (
                        <div className="space-y-6">
                          {[...module.lms_chapters].sort((a:any, b:any) => a.order_index - b.order_index).map((chapter: any, cIndex: number) => (
                            <div 
                              key={chapter.id} 
                              className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden"
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); onDragStart(e, chapter.id, 'chapter', module.id); }}
                              onDragEnd={(e) => { e.stopPropagation(); onDragEnd(e); }}
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnter={(e) => { e.stopPropagation(); handleDragEnter(e, chapter.id, 'chapter', module.id); }}
                            >
                              {/* Chapter Header */}
                              <div 
                                onClick={() => toggleChapter(chapter.id)}
                                className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors group/chheader"
                              >
                                <div className="flex items-center gap-3">
                                  <GripVertical 
                                    size={14} 
                                    className="text-slate-300" 
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover/chheader:scale-110 transition-transform">
                                    <Layout size={14} />
                                  </div>
                                  <div>
                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">{chapter.title}</h4>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em]">{chapter.lessons?.length || 0} Classes</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg transition-all ${expandedChapters.has(chapter.id) ? 'rotate-180 bg-blue-50 text-blue-600' : 'text-slate-300'}`}>
                                      <ChevronDown size={14} />
                                    </div>
                                    <div className="h-4 w-[1px] bg-slate-100 mx-1" />
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setLessonModal({ show: true, moduleId: module.id, chapterId: chapter.id, isEditing: false, currentLessonsCount: (chapter.lessons?.length || 0) }); }}
                                      className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all rounded-lg"
                                      title="Add Lesson to Chapter"
                                    >
                                      <Plus size={14} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setChapterModal({ show: true, moduleId: module.id, isEditing: true, chapterId: chapter.id, initialData: chapter, currentChaptersCount: module.lms_chapters.length }); }}
                                      className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all rounded-lg"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <div onClick={(e) => e.stopPropagation()}>
                                      <DeleteButton id={chapter.id} table="lms_chapters" title={chapter.title} onSuccess={handleRefresh} />
                                    </div>
                                </div>
                              </div>

                              {/* Chapter Lessons */}
                              {expandedChapters.has(chapter.id) && (
                                <div className="p-3 space-y-2 animate-in slide-in-from-top-2">
                                  {(chapter.lessons || []).length === 0 ? (
                                    <div className="py-6 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No topics in this chapter</p>
                                    </div>
                                  ) : (
                                    [...chapter.lessons].sort((a:any, b:any) => a.order_index - b.order_index).map((lesson: any, lIndex: number) => (
                                      <div 
                                        key={lesson.id} 
                                        className="group/lesson flex items-center gap-4 p-3 rounded-xl hover:bg-white transition-all border border-transparent hover:border-slate-100 shadow-sm"
                                        draggable
                                        onDragStart={(e) => { e.stopPropagation(); onDragStart(e, lesson.id, 'lesson', chapter.id); }}
                                        onDragEnd={(e) => { e.stopPropagation(); onDragEnd(e); }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDragEnter={(e) => { e.stopPropagation(); handleDragEnter(e, lesson.id, 'lesson', chapter.id); }}
                                      >
                                        <GripVertical size={14} className="text-slate-200 group-hover/lesson:text-slate-400 cursor-grab shrink-0" />
                                        <div className="px-2 h-6 shrink-0 rounded bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400 group-hover/lesson:bg-blue-100 group-hover/lesson:text-blue-600 transition-colors">
                                          Class {lIndex + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <h4 className="text-xs font-black text-slate-900">{lesson.title}</h4>
                                              {lesson.batches && lesson.batches.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                  {lesson.batches.map((bid: string) => {
                                                    const b = availableBatches.find(x => x.id === bid);
                                                    if (!b) return null;
                                                    return (
                                                      <span key={bid} className="text-[7px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded uppercase tracking-wider">
                                                        {b.type}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                                            <button onClick={() => setPreviewLesson(lesson)} className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all shadow-sm" title="Preview Class"><Eye size={14} /></button>
                                            <button onClick={() => setLessonModal({ show: true, moduleId: module.id, chapterId: chapter.id, isEditing: true, lessonId: lesson.id, initialData: lesson })} className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm"><Edit2 size={14} /></button>
                                            <DeleteButton id={lesson.id} table="lessons" title={lesson.title} onSuccess={handleRefresh} />
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Direct Lessons (Legacy / Uncategorized) */}
                      {module.lessons?.length > 0 && (
                        <div className="space-y-3">
                           <div className="flex items-center gap-3 px-3">
                              <div className="h-[1px] flex-1 bg-slate-100" />
                              <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] whitespace-nowrap">Uncategorized Classes</h4>
                              <div className="h-[1px] flex-1 bg-slate-100" />
                           </div>
                           <div className="space-y-2">
                            {module.lessons.sort((a:any, b:any) => a.order_index - b.order_index).map((lesson: any, lIndex: number) => (
                              <div 
                                key={lesson.id} 
                                className="group/lesson flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                              >
                                 <GripVertical size={14} className="text-slate-200 group-hover/lesson:text-slate-400 cursor-grab shrink-0" />
                                 <div className="px-2 h-6 shrink-0 rounded bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400 group-hover/lesson:bg-blue-100 group-hover/lesson:text-blue-600 transition-colors">
                                   Class {lIndex + 1}
                                 </div>
                                 <div className="flex-1">
                                     <div className="flex items-center gap-2">
                                       <h4 className="text-xs font-black text-slate-900">{lesson.title}</h4>
                                       {lesson.batches && lesson.batches.length > 0 && (
                                         <div className="flex flex-wrap gap-1">
                                           {lesson.batches.map((bid: string) => {
                                             const b = availableBatches.find(x => x.id === bid);
                                              if (!b) return null;
                                             return (
                                               <span key={bid} className="text-[7px] font-black text-blue-600 bg-blue-50 px-1 py-0.5 rounded uppercase tracking-wider">
                                                 {b.type}
                                               </span>
                                             );
                                           })}
                                         </div>
                                       )}
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-1 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                                    <button onClick={() => setPreviewLesson(lesson)} className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all shadow-sm" title="Preview Class"><Eye size={14} /></button>
                                    <button onClick={() => setLessonModal({ show: true, moduleId: module.id, isEditing: true, lessonId: lesson.id, initialData: lesson })} className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm"><Edit2 size={14} /></button>
                                    <DeleteButton id={lesson.id} table="lessons" title={lesson.title} onSuccess={handleRefresh} />
                                 </div>
                              </div>
                            ))}
                           </div>
                        </div>
                      )}

                      {(!module.lms_chapters || module.lms_chapters.length === 0) && (!module.lessons || module.lessons.length === 0) && (
                        <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-3xl">
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No chapters or topics added to this module yet</p>
                        </div>
                      )}
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
