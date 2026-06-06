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
  Eye,
  Video,
  Award,
  EyeOff,
  Lock,
  Unlock,
  HelpCircle
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

  // Advanced Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'video' | 'notes' | 'assignment' | 'mcq' | 'free' | 'locked'>('all');

  // Safety guardrail for reordering
  const reorderEnabled = !searchQuery.trim() && contentTypeFilter === 'all';

  // Memoized curriculum statistics
  const stats = useMemo(() => {
    let totalModules = modules.length;
    let totalChapters = 0;
    let totalLessons = 0;
    let videosCount = 0;
    let notesCount = 0;
    let assignmentsCount = 0;
    let mcqsCount = 0;
    let freeCount = 0;
    let lockedCount = 0;

    modules.forEach(m => {
      totalChapters += m.lms_chapters?.length || 0;
      
      const directLessons = m.lessons || [];
      directLessons.forEach((l: any) => {
        totalLessons++;
        const type = l.lesson_type || l.type || 'video';
        if (type === 'video') videosCount++;
        else if (type === 'notes') notesCount++;
        else if (type === 'assignment') assignmentsCount++;
        else if (type === 'mcq') mcqsCount++;
        if (l.is_free) freeCount++;
        else lockedCount++;
      });

      const chapters = m.lms_chapters || [];
      chapters.forEach((c: any) => {
        const chapterLessons = c.lessons || [];
        chapterLessons.forEach((l: any) => {
          totalLessons++;
          const type = l.lesson_type || l.type || 'video';
          if (type === 'video') videosCount++;
          else if (type === 'notes') notesCount++;
          else if (type === 'assignment') assignmentsCount++;
          else if (type === 'mcq') mcqsCount++;
          if (l.is_free) freeCount++;
          else lockedCount++;
        });
      });
    });

    return {
      totalModules,
      totalChapters,
      totalLessons,
      videosCount,
      notesCount,
      assignmentsCount,
      mcqsCount,
      freeCount,
      lockedCount
    };
  }, [modules]);

  // Memoized dynamic curriculum filtering
  const filteredModules = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return modules.map(mod => {
      // Filter chapters first
      const filteredChapters = (mod.lms_chapters || []).map((ch: any) => {
        const filteredLessons = (ch.lessons || []).filter((l: any) => {
          const matchesQuery = !query || l.title?.toLowerCase().includes(query) || (l.lesson_type || l.type)?.toLowerCase().includes(query);
          if (!matchesQuery) return false;

          const lessonType = l.lesson_type || l.type || 'video';
          if (contentTypeFilter === 'video' && lessonType !== 'video') return false;
          if (contentTypeFilter === 'notes' && lessonType !== 'notes') return false;
          if (contentTypeFilter === 'assignment' && lessonType !== 'assignment') return false;
          if (contentTypeFilter === 'mcq' && lessonType !== 'mcq') return false;
          if (contentTypeFilter === 'free' && !l.is_free) return false;
          if (contentTypeFilter === 'locked' && l.is_free) return false;

          return true;
        });

        const chapterMatchesQuery = !query || ch.title?.toLowerCase().includes(query);

        if (filteredLessons.length > 0 || (chapterMatchesQuery && contentTypeFilter === 'all')) {
          return {
            ...ch,
            lessons: filteredLessons
          };
        }
        return null;
      }).filter(Boolean);

      // Filter direct lessons
      const filteredDirectLessons = (mod.lessons || []).filter((l: any) => {
        const matchesQuery = !query || l.title?.toLowerCase().includes(query) || (l.lesson_type || l.type)?.toLowerCase().includes(query);
        if (!matchesQuery) return false;

        const lessonType = l.lesson_type || l.type || 'video';
        if (contentTypeFilter === 'video' && lessonType !== 'video') return false;
        if (contentTypeFilter === 'notes' && lessonType !== 'notes') return false;
        if (contentTypeFilter === 'assignment' && lessonType !== 'assignment') return false;
        if (contentTypeFilter === 'mcq' && lessonType !== 'mcq') return false;
        if (contentTypeFilter === 'free' && !l.is_free) return false;
        if (contentTypeFilter === 'locked' && l.is_free) return false;

        return true;
      });

      const moduleMatchesQuery = !query || mod.title?.toLowerCase().includes(query) || mod.subtitle?.toLowerCase().includes(query);

      if (filteredChapters.length > 0 || filteredDirectLessons.length > 0 || (moduleMatchesQuery && contentTypeFilter === 'all')) {
        return {
          ...mod,
          lms_chapters: filteredChapters,
          lessons: filteredDirectLessons
        };
      }
      return null;
    }).filter(Boolean);
  }, [modules, searchQuery, contentTypeFilter]);

  // Helper functions to handle dynamic search-auto-expanding
  const isModuleExpanded = (moduleId: string) => {
    if (searchQuery.trim() || contentTypeFilter !== 'all') return true;
    return expandedModules.has(moduleId);
  };

  const isChapterExpanded = (chapterId: string) => {
    if (searchQuery.trim() || contentTypeFilter !== 'all') return true;
    return expandedChapters.has(chapterId);
  };

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
    setModules(prev => prev.map(m => {
      const updatedLessons = m.lessons?.map((l: any) => 
        l.id === lessonId ? { ...l, [field]: !currentValue } : l
      ) || [];

      const updatedChapters = m.lms_chapters?.map((c: any) => ({
        ...c,
        lessons: c.lessons?.map((l: any) => 
          l.id === lessonId ? { ...l, [field]: !currentValue } : l
        ) || []
      })) || [];

      return {
        ...m,
        lessons: updatedLessons,
        lms_chapters: updatedChapters
      };
    }));

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

  const expandAll = () => {
    const allModIds = modules.map(m => m.id);
    const allChapIds = modules.flatMap(m => (m.lms_chapters || []).map((c: any) => c.id));
    setExpandedModules(new Set(allModIds));
    setExpandedChapters(new Set(allChapIds));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedChapters(new Set());
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
    <div className={`space-y-10 transition-all duration-500 ${isFullScreen ? 'fixed inset-0 z-[100] bg-[#f8fafc] dark:bg-slate-950 p-8 overflow-y-auto' : ''}`}>
      
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
           <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Copy to Course</h3>
                <button onClick={() => setCopyToCourseModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-805 rounded-lg transition-all cursor-pointer"><X size={18} className="text-slate-900 dark:text-white" /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Select the course where you want to copy <span className="font-bold text-slate-900 dark:text-white">"{copyToCourseModal.module.title}"</span>:</p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-550">Target Course</label>
                    <select 
                      value={targetCourseId}
                      onChange={(e) => setTargetCourseId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/60 rounded-xl outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-900 dark:text-slate-200"
                    >
                      {initialCourses.map(course => (
                        <option key={course.id} value={course.id} className="dark:bg-slate-900">{course.title} {course.id === currentCourseId ? "(Current)" : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4">
                   <button 
                    onClick={() => setCopyToCourseModal(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-350 font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => duplicateModule(copyToCourseModal.module, targetCourseId)}
                    disabled={loading}
                    className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer text-xs"
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
          className="fixed top-8 right-8 z-[110] p-3 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-455 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Exit Fullscreen"
        >
          <X size={20} />
        </button>
      )}

      {previewLesson && (
        <LessonPreviewModal 
          lesson={previewLesson} 
          onClose={() => setPreviewLesson(null)} 
        />
      )}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
            <Settings size={14} className="animate-spin-slow" />
            LMS Content Engine
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{mode === "global" ? "Course Curriculum" : "Batch Content Manager"}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{mode === "global" ? "Design global course templates for all students." : "Manage specific content overrides for individual batches."}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          {mode === "global" ? (
            <div className="px-3 py-1.5 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Select Course:</span>
              <select 
                value={selectedCourseId} 
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-850 dark:text-slate-200 outline-none cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-none py-1 focus:ring-0"
              >
                {initialCourses.map(course => (
                  <option key={course.id} value={course.id} className="dark:bg-slate-900 dark:text-slate-200">{course.title}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="px-3 py-1.5 flex items-center gap-3">
              <Filter size={14} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Select Batch:</span>
              <select 
                value={selectedBatchId} 
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors border-none py-1 focus:ring-0"
              >
                {availableBatches.map(batch => (
                  <option key={batch.id} value={batch.id} className="dark:bg-slate-900 dark:text-slate-200">{batch.batch_display}</option>
                ))}
              </select>
            </div>
          )}
          <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800 hidden md:block" />
          <button 
            onClick={() => setModuleModal({ show: true, isEditing: false })}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 cursor-pointer"
          >
             <Plus size={14} /> Add Module
          </button>
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-450 hover:border-blue-200 dark:hover:border-blue-900/60 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            title={isFullScreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          >
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Curriculum Summary Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        
        {/* Modules Stat */}
        <div 
          onClick={collapseAll}
          className="group relative bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900/40 hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden"
          title="Click to collapse all modules"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <BookOpen size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-550">Modules</p>
              <h4 className="text-2xl font-black text-slate-950 dark:text-white mt-0.5">{stats.totalModules}</h4>
            </div>
          </div>
        </div>

        {/* Chapters Stat */}
        <div 
          onClick={expandAll}
          className="group relative bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/40 hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden"
          title="Click to expand all modules"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Layout size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-550">Chapters</p>
              <h4 className="text-2xl font-black text-slate-950 dark:text-white mt-0.5">{stats.totalChapters}</h4>
            </div>
          </div>
        </div>

        {/* Total Classes Stat */}
        <div 
          onClick={() => setContentTypeFilter('all')}
          className={`group relative bg-white dark:bg-slate-900/80 rounded-2xl border p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden ${
            contentTypeFilter === 'all' 
              ? 'border-purple-200 dark:border-purple-900/60 ring-2 ring-purple-500/20' 
              : 'border-slate-100 dark:border-slate-800 hover:border-purple-100 dark:hover:border-purple-900/40'
          }`}
          title="Filter: Show all content types"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <Award size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-550">Total Classes</p>
              <h4 className="text-2xl font-black text-slate-950 dark:text-white mt-0.5">{stats.totalLessons}</h4>
            </div>
          </div>
        </div>

        {/* Content Type Filter Stat */}
        <div className="group relative bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-550 px-1">Filter by Type</p>
          <div className="flex flex-wrap gap-1.5">
            <button 
              onClick={() => setContentTypeFilter(contentTypeFilter === 'video' ? 'all' : 'video')}
              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all border ${
                contentTypeFilter === 'video' 
                  ? 'bg-blue-600 border-blue-605 text-white shadow-sm shadow-blue-500/20' 
                  : 'bg-blue-50 hover:bg-blue-105 border-blue-100 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-405'
              }`}
            >
              <Video size={10} /> Video ({stats.videosCount})
            </button>

            <button 
              onClick={() => setContentTypeFilter(contentTypeFilter === 'notes' ? 'all' : 'notes')}
              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all border ${
                contentTypeFilter === 'notes' 
                  ? 'bg-emerald-600 border-emerald-605 text-white shadow-sm shadow-emerald-500/20' 
                  : 'bg-emerald-50 hover:bg-emerald-105 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-405'
              }`}
            >
              <BookOpen size={10} /> Theory ({stats.notesCount})
            </button>

            <button 
              onClick={() => setContentTypeFilter(contentTypeFilter === 'assignment' ? 'all' : 'assignment')}
              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all border ${
                contentTypeFilter === 'assignment' 
                  ? 'bg-amber-600 border-amber-605 text-white shadow-sm shadow-amber-500/20' 
                  : 'bg-amber-50 hover:bg-amber-105 border-amber-100 text-amber-705 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400'
              }`}
            >
              <Award size={10} /> Assignment ({stats.assignmentsCount})
            </button>

            <button 
              onClick={() => setContentTypeFilter(contentTypeFilter === 'mcq' ? 'all' : 'mcq')}
              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all border ${
                contentTypeFilter === 'mcq' 
                  ? 'bg-purple-600 border-purple-605 text-white shadow-sm shadow-purple-500/20' 
                  : 'bg-purple-50 hover:bg-purple-105 border-purple-100 text-purple-705 dark:bg-purple-950/30 dark:border-purple-900/50 dark:text-purple-400'
              }`}
            >
              <HelpCircle size={10} /> MCQ ({stats.mcqsCount})
            </button>
            
            <button 
              onClick={() => setContentTypeFilter(contentTypeFilter === 'free' ? 'all' : 'free')}
              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all border ${
                contentTypeFilter === 'free' 
                  ? 'bg-emerald-600 border-emerald-650 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              Free ({stats.freeCount})
            </button>

            <button 
              onClick={() => setContentTypeFilter(contentTypeFilter === 'locked' ? 'all' : 'locked')}
              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all border ${
                contentTypeFilter === 'locked' 
                  ? 'bg-rose-600 border-rose-605 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              Locked ({stats.lockedCount})
            </button>
          </div>
        </div>

      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        
        {/* Search Input */}
        <div className="relative w-full md:max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-550" size={16} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search modules, chapters, or classes..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-transparent border border-slate-200/80 dark:border-slate-800 dark:bg-slate-950/40 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-sm font-medium text-slate-800 dark:text-slate-200"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Reset Badge & Tree Controls */}
        <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
          {(searchQuery || contentTypeFilter !== 'all') && (
            <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/40 text-amber-800 dark:text-amber-400 text-xs font-bold rounded-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
              Active Filters
              <button 
                onClick={() => { setSearchQuery(""); setContentTypeFilter('all'); }}
                className="hover:text-rose-600 transition-colors cursor-pointer"
                title="Clear all filters"
              >
                <X size={12} className="stroke-[3]" />
              </button>
            </span>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <button 
              onClick={expandAll}
              className="px-3 py-1.5 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700/60"
            >
              Expand All
            </button>
            <button 
              onClick={collapseAll}
              className="px-3 py-1.5 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700/60"
            >
              Collapse All
            </button>
          </div>
        </div>

      </div>

      {/* Main Content Layout */}
      <div className={`grid grid-cols-1 gap-8 ${isFullScreen ? 'col-span-1' : 'lg:grid-cols-12'}`}>
        
        {/* Module Sidebar Navigator */}
        {!isFullScreen && (
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden sticky top-24">
              <div className="p-4 border-b border-slate-100/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                 <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Module Roadmap</h3>
                 <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-655 dark:text-slate-450 rounded-full">{filteredModules.length}</span>
              </div>
              <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar relative space-y-1">
                {/* Visual Timeline line */}
                <div className="absolute left-7 top-6 bottom-6 w-[2px] bg-slate-100 dark:bg-slate-800 pointer-events-none" />
                
                {filteredModules.map((module, index) => (
                  <button 
                    key={module.id} 
                    onClick={() => document.getElementById(module.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all group flex items-start gap-3 relative z-10 cursor-pointer"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-100 dark:group-hover:border-blue-900/60 transition-all duration-300 shadow-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0 mt-0.5">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors line-clamp-1">{module.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {(module.lms_chapters?.length || 0)} chapters • {(module.lessons?.length || 0) + (module.lms_chapters?.reduce((sum: number, c: any) => sum + (c.lessons?.length || 0), 0) || 0)} classes
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20">
                 <button 
                  onClick={() => setModuleModal({ show: true, isEditing: false })}
                  className="w-full py-2.5 border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-550 flex items-center justify-center gap-2 cursor-pointer"
                >
                    <Plus size={14} /> Add New Module
                 </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Builder Area */}
        <div className={`${isFullScreen ? 'col-span-1' : 'lg:col-span-9'} space-y-12 pb-20`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-widest animate-pulse">Building Curriculum Tree...</p>
            </div>
          ) : modules.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-16 text-center rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                 <BookOpen size={32} />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Curriculum is Empty</h3>
                <p className="text-sm text-slate-400 dark:text-slate-550">Get started by creating your first course module. You can then add chapters and classes to it.</p>
              </div>
              <button 
                onClick={() => setModuleModal({ show: true, isEditing: false })}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-705 text-white rounded-xl font-semibold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                Create First Module
              </button>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-16 text-center rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-6">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                 <Search size={32} />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Results Found</h3>
                <p className="text-sm text-slate-400 dark:text-slate-550">We couldn't find any modules, chapters, or classes matching your search or filters.</p>
              </div>
              <button 
                onClick={() => { setSearchQuery(""); setContentTypeFilter('all'); }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            filteredModules.map((module, mIndex) => (
              <div 
                key={module.id} 
                id={module.id} 
                className="relative group scroll-mt-24 transition-all duration-300"
                draggable={reorderEnabled}
                onDragStart={(e) => reorderEnabled && onDragStart(e, module.id, 'module')}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => reorderEnabled && handleDragEnter(e, module.id, 'module')}
              >                 <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden relative z-10 hover:border-slate-200 dark:hover:border-slate-700/80 hover:shadow-md transition-all">
                  <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-900/40 border-b border-slate-100/50 dark:border-slate-800/40">
                     <div 
                        className="space-y-1.5 flex-1 cursor-pointer"
                        onClick={() => toggleModule(module.id)}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          {reorderEnabled ? (
                            <GripVertical size={16} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0" onClick={(e) => e.stopPropagation()} />
                          ) : (
                            <div className="text-slate-305 dark:text-slate-700/60 p-0.5 shrink-0" title="Reordering disabled during filtering">
                              <Lock size={12} className="opacity-60" />
                            </div>
                          )}
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-md uppercase tracking-wider">Module {mIndex + 1}</span>
                          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                            {(module.lms_chapters?.length || 0)} chapters • {(module.lessons?.length || 0) + (module.lms_chapters?.reduce((sum: number, c: any) => sum + (c.lessons?.length || 0), 0) || 0)} classes
                          </span>
                          <span className="ml-auto md:ml-0 text-slate-400 dark:text-slate-550">
                            {isModuleExpanded(module.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-950 dark:text-white line-clamp-1">{module.title}</h2>
                     </div>
                     <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
                           <button onClick={(e) => { e.stopPropagation(); moveItem('module', module.id, 'up'); }} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors cursor-pointer" title="Move Up"><ArrowUp size={12} className="text-slate-500 dark:text-slate-400" /></button>
                           <button onClick={(e) => { e.stopPropagation(); moveItem('module', module.id, 'down'); }} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors cursor-pointer" title="Move Down"><ArrowDown size={12} className="text-slate-500 dark:text-slate-400" /></button>
                        </div>
                        
                        <button 
                          onClick={() => setChapterModal({ show: true, moduleId: module.id, isEditing: false, currentChaptersCount: (module.lms_chapters?.length || 0) })}
                          className="p-1.5 bg-purple-50 hover:bg-purple-100/80 dark:bg-purple-950/35 dark:hover:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                          title="Add Chapter to Module"
                        >
                           <FolderPlus size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setModuleModal({ show: true, isEditing: true, moduleId: module.id, initialData: module }); }}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/35 dark:hover:bg-amber-950/60 text-amber-600 dark:text-amber-450 border border-amber-100/50 dark:border-amber-900/30 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                          title="Edit Module Name"
                        >
                           <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCopyToCourseModal({ show: true, module }); setTargetCourseId(currentCourseId); }}
                          className="p-1.5 bg-teal-50 hover:bg-teal-100/80 dark:bg-teal-950/35 dark:hover:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/30 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                          title="Copy to Course"
                        >
                           <Copy size={16} />
                        </button>
                        <DeleteButton 
                          id={module.id} 
                          table="lms_modules" 
                          title={module.title} 
                          onSuccess={handleRefresh} 
                          showText={false}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/35 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-455 border border-rose-100/50 dark:border-rose-900/30 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                        />
                     </div>
                  </div>

                  {isModuleExpanded(module.id) && (
                    <div className="p-6 border-t border-slate-100/60 dark:border-slate-800/80 bg-slate-50/10 dark:bg-slate-900/10 animate-in slide-in-from-top-2 space-y-6">
                      
                      {/* Chapters Area */}
                      {module.lms_chapters && module.lms_chapters.length > 0 && (
                        <div className="space-y-4">
                          {[...module.lms_chapters].sort((a:any, b:any) => a.order_index - b.order_index).map((chapter: any, cIndex: number) => (
                            <div 
                              key={chapter.id} 
                              className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm relative"
                              draggable={reorderEnabled}
                              onDragStart={(e) => { e.stopPropagation(); reorderEnabled && onDragStart(e, chapter.id, 'chapter', module.id); }}
                              onDragEnd={(e) => { e.stopPropagation(); onDragEnd(e); }}
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnter={(e) => { e.stopPropagation(); reorderEnabled && handleDragEnter(e, chapter.id, 'chapter', module.id); }}
                            >
                              {/* Chapter Header */}
                              <div 
                                onClick={() => toggleChapter(chapter.id)}
                                className="px-4 py-3 bg-slate-50/30 dark:bg-slate-900/20 border-b border-slate-100/60 dark:border-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group/chheader"
                              >
                                <div className="flex items-center gap-3">
                                  {reorderEnabled ? (
                                    <GripVertical 
                                      size={14} 
                                      className="text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing" 
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <div className="text-slate-350 dark:text-slate-700/60 p-0.5" title="Reordering disabled during filtering">
                                      <Lock size={12} className="opacity-60" />
                                    </div>
                                  )}
                                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg group-hover/chheader:scale-105 transition-transform">
                                    <Layout size={14} />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">{chapter.title}</h4>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">{chapter.lessons?.length || 0} Classes</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg transition-all ${isChapterExpanded(chapter.id) ? 'rotate-180 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'text-slate-350 dark:text-slate-655'}`}>
                                      <ChevronDown size={14} />
                                    </div>
                                    <div className="h-4 w-[1px] bg-slate-100 dark:bg-slate-800 mx-1" />
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setLessonModal({ 
                                          show: true, 
                                          moduleId: module.id, 
                                          chapterId: chapter.id, 
                                          isEditing: false, 
                                          initialData: { type: 'video' },
                                          currentLessonsCount: (chapter.lessons?.length || 0) 
                                        }); 
                                      }}
                                      className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded-lg cursor-pointer"
                                      title="Add Video Class"
                                    >
                                      <Video size={14} />
                                    </button>
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setLessonModal({ 
                                          show: true, 
                                          moduleId: module.id, 
                                          chapterId: chapter.id, 
                                          isEditing: false, 
                                          initialData: { type: 'notes' },
                                          currentLessonsCount: (chapter.lessons?.length || 0) 
                                        }); 
                                      }}
                                      className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all rounded-lg cursor-pointer"
                                      title="Add Theory Lesson"
                                    >
                                      <BookOpen size={14} />
                                    </button>
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setLessonModal({ 
                                          show: true, 
                                          moduleId: module.id, 
                                          chapterId: chapter.id, 
                                          isEditing: false, 
                                          initialData: { type: 'assignment' },
                                          currentLessonsCount: (chapter.lessons?.length || 0) 
                                        }); 
                                      }}
                                      className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-all rounded-lg cursor-pointer"
                                      title="Add Assignment"
                                    >
                                      <Award size={14} />
                                    </button>
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setLessonModal({ 
                                          show: true, 
                                          moduleId: module.id, 
                                          chapterId: chapter.id, 
                                          isEditing: false, 
                                          initialData: { type: 'mcq' },
                                          currentLessonsCount: (chapter.lessons?.length || 0) 
                                        }); 
                                      }}
                                      className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-all rounded-lg cursor-pointer"
                                      title="Add MCQ Quiz"
                                    >
                                      <HelpCircle size={14} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setChapterModal({ show: true, moduleId: module.id, isEditing: true, chapterId: chapter.id, initialData: chapter, currentChaptersCount: module.lms_chapters.length }); }}
                                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded-lg cursor-pointer"
                                      title="Edit Chapter"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <div onClick={(e) => e.stopPropagation()}>
                                      <DeleteButton 
                                        id={chapter.id} 
                                        table="lms_chapters" 
                                        title={chapter.title} 
                                        onSuccess={handleRefresh} 
                                        showText={false}
                                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 hover:text-rose-600 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                      />
                                    </div>
                                </div>
                              </div>

                              {/* Chapter Lessons */}
                              {isChapterExpanded(chapter.id) && (
                                <div className="p-3 bg-white dark:bg-slate-900/30 space-y-2 animate-in slide-in-from-top-2 border-l-2 border-blue-500/20 ml-6 pl-4 my-2">
                                  {(chapter.lessons || []).length === 0 ? (
                                    <div className="py-6 text-center border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                      <p className="text-[10px] font-bold text-slate-300 dark:text-slate-550 uppercase tracking-widest">No classes in this chapter</p>
                                    </div>
                                  ) : (
                                    [...chapter.lessons].sort((a:any, b:any) => a.order_index - b.order_index).map((lesson: any, lIndex: number) => {
                                      const lessonType = lesson.lesson_type || lesson.type || 'video';
                                      let TypeIcon = Video;
                                      let typeColor = 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400';
                                      let typeLabel = 'Video';
                                      
                                      if (lessonType === 'notes') {
                                        TypeIcon = BookOpen;
                                        typeColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400';
                                        typeLabel = 'Theory';
                                      } else if (lessonType === 'assignment') {
                                        TypeIcon = Award;
                                        typeColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-450';
                                        typeLabel = 'Assignment';
                                      } else if (lessonType === 'mcq') {
                                        TypeIcon = HelpCircle;
                                        typeColor = 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400';
                                        typeLabel = 'MCQ';
                                      }

                                      return (
                                        <div 
                                          key={lesson.id} 
                                          className="group/lesson flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800 shadow-sm bg-white dark:bg-slate-900"
                                          draggable={reorderEnabled}
                                          onDragStart={(e) => { e.stopPropagation(); reorderEnabled && onDragStart(e, lesson.id, 'lesson', chapter.id); }}
                                          onDragEnd={(e) => { e.stopPropagation(); onDragEnd(e); }}
                                          onDragOver={(e) => e.preventDefault()}
                                          onDragEnter={(e) => { e.stopPropagation(); reorderEnabled && handleDragEnter(e, lesson.id, 'lesson', chapter.id); }}
                                        >
                                          {reorderEnabled ? (
                                            <GripVertical size={14} className="text-slate-200 dark:text-slate-700 group-hover/lesson:text-slate-450 cursor-grab shrink-0" />
                                          ) : (
                                            <div className="text-slate-200 dark:text-slate-800/80 p-0.5 shrink-0" title="Reordering disabled during filtering">
                                              <Lock size={10} className="opacity-60" />
                                            </div>
                                          )}
                                          <div className={`p-1.5 rounded-lg ${typeColor} shrink-0`}>
                                            <TypeIcon size={14} />
                                          </div>
                                          <div className="px-2 h-6 shrink-0 rounded bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-455 border border-slate-100/50 dark:border-slate-800">
                                            Class {lIndex + 1}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{lesson.title}</h4>
                                                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${typeColor}`}>
                                                  {typeLabel}
                                                </span>
                                                {lesson.batches && lesson.batches.length > 0 && (
                                                  <div className="flex flex-wrap gap-1">
                                                    {lesson.batches.map((bid: string) => {
                                                      const b = availableBatches.find(x => x.id === bid);
                                                      if (!b) return null;
                                                      return (
                                                        <span key={bid} className="text-[8px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                          {b.type}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                          </div>
                                          
                                          {/* Access Toggles */}
                                          <div className="flex items-center gap-1.5 shrink-0 select-none">
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); toggleLessonField(lesson.id, 'is_free', lesson.is_free); }}
                                              className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                                                lesson.is_free 
                                                  ? 'bg-emerald-50 hover:bg-emerald-105 border-emerald-200 text-emerald-705 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400' 
                                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-455'
                                              }`}
                                              title={lesson.is_free ? "Toggle to Paid only" : "Toggle to Free Preview"}
                                            >
                                              {lesson.is_free ? <Eye size={10} className="text-emerald-600 dark:text-emerald-400" /> : <EyeOff size={10} className="text-slate-400 dark:text-slate-500" />}
                                              {lesson.is_free ? "Free" : "Paid"}
                                            </button>

                                            <button 
                                              onClick={(e) => { e.stopPropagation(); toggleLessonField(lesson.id, 'is_locked', lesson.is_locked); }}
                                              className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                                                lesson.is_locked 
                                                  ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-455' 
                                                  : 'bg-blue-50 hover:bg-blue-105 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400'
                                              }`}
                                              title={lesson.is_locked ? "Click to unlock class" : "Click to lock class"}
                                            >
                                              {lesson.is_locked ? <Lock size={10} className="text-rose-600 dark:text-rose-455" /> : <Unlock size={10} className="text-blue-600 dark:text-blue-400" />}
                                              {lesson.is_locked ? "Locked" : "Unlocked"}
                                            </button>
                                          </div>

                                          <div className="flex items-center gap-1 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                                              <button onClick={() => setPreviewLesson(lesson)} className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm cursor-pointer" title="Preview Class"><Eye size={12} /></button>
                                              <button onClick={() => setLessonModal({ show: true, moduleId: module.id, chapterId: chapter.id, isEditing: true, lessonId: lesson.id, initialData: lesson })} className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm cursor-pointer" title="Edit Class"><Edit2 size={12} /></button>
                                              <DeleteButton 
                                                id={lesson.id} 
                                                table="lessons" 
                                                title={lesson.title} 
                                                onSuccess={handleRefresh} 
                                                showText={false}
                                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 dark:hover:text-rose-455 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/30 transition-all shadow-sm cursor-pointer"
                                              />
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Direct Lessons (Legacy / Uncategorized) */}
                      {module.lessons?.length > 0 && (
                        <div className="space-y-3 pt-2">
                           <div className="flex items-center gap-3 px-3">
                              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800/60" />
                              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Uncategorized Classes</h4>
                              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800/60" />
                           </div>
                           <div className="space-y-2">
                            {module.lessons.sort((a:any, b:any) => a.order_index - b.order_index).map((lesson: any, lIndex: number) => {
                              const lessonType = lesson.lesson_type || lesson.type || 'video';
                              let TypeIcon = Video;
                              let typeColor = 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400';
                              let typeLabel = 'Video';
                              
                              if (lessonType === 'notes') {
                                TypeIcon = BookOpen;
                                typeColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400';
                                typeLabel = 'Theory';
                              } else if (lessonType === 'assignment') {
                                TypeIcon = Award;
                                typeColor = 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-450';
                                typeLabel = 'Assignment';
                              } else if (lessonType === 'mcq') {
                                TypeIcon = HelpCircle;
                                typeColor = 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400';
                                typeLabel = 'MCQ';
                              }

                              return (
                                <div 
                                  key={lesson.id} 
                                  className="group/lesson flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800 shadow-sm bg-white dark:bg-slate-900"
                                  draggable={reorderEnabled}
                                  onDragStart={(e) => { e.stopPropagation(); reorderEnabled && onDragStart(e, lesson.id, 'lesson', module.id); }}
                                  onDragEnd={(e) => { e.stopPropagation(); onDragEnd(e); }}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDragEnter={(e) => { e.stopPropagation(); reorderEnabled && handleDragEnter(e, lesson.id, 'lesson', module.id); }}
                                >
                                   {reorderEnabled ? (
                                     <GripVertical size={14} className="text-slate-200 dark:text-slate-700 group-hover/lesson:text-slate-455 cursor-grab shrink-0" />
                                   ) : (
                                     <div className="text-slate-200 dark:text-slate-800/80 p-0.5 shrink-0" title="Reordering disabled during filtering">
                                       <Lock size={10} className="opacity-60" />
                                     </div>
                                   )}
                                   <div className={`p-1.5 rounded-lg ${typeColor} shrink-0`}>
                                     <TypeIcon size={14} />
                                   </div>
                                   <div className="px-2 h-6 shrink-0 rounded bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-455 border border-slate-100/50 dark:border-slate-800">
                                     Class {lIndex + 1}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="flex flex-wrap items-center gap-2">
                                         <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{lesson.title}</h4>
                                         <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${typeColor}`}>
                                           {typeLabel}
                                         </span>
                                         {lesson.batches && lesson.batches.length > 0 && (
                                           <div className="flex flex-wrap gap-1">
                                             {lesson.batches.map((bid: string) => {
                                               const b = availableBatches.find(x => x.id === bid);
                                               if (!b) return null;
                                               return (
                                                 <span key={bid} className="text-[8px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                   {b.type}
                                                 </span>
                                               );
                                             })}
                                           </div>
                                         )}
                                       </div>
                                   </div>
                                   
                                   {/* Access Toggles */}
                                   <div className="flex items-center gap-1.5 shrink-0 select-none">
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); toggleLessonField(lesson.id, 'is_free', lesson.is_free); }}
                                       className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                                         lesson.is_free 
                                           ? 'bg-emerald-50 hover:bg-emerald-105 border-emerald-200 text-emerald-705 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400' 
                                           : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-455'
                                       }`}
                                       title={lesson.is_free ? "Toggle to Paid only" : "Toggle to Free Preview"}
                                     >
                                       {lesson.is_free ? <Eye size={10} className="text-emerald-600 dark:text-emerald-400" /> : <EyeOff size={10} className="text-slate-400 dark:text-slate-555" />}
                                       {lesson.is_free ? "Free" : "Paid"}
                                     </button>

                                     <button 
                                       onClick={(e) => { e.stopPropagation(); toggleLessonField(lesson.id, 'is_locked', lesson.is_locked); }}
                                       className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                                         lesson.is_locked 
                                           ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-455' 
                                           : 'bg-blue-50 hover:bg-blue-105 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400'
                                       }`}
                                       title={lesson.is_locked ? "Click to unlock class" : "Click to lock class"}
                                     >
                                       {lesson.is_locked ? <Lock size={10} className="text-rose-600 dark:text-rose-455" /> : <Unlock size={10} className="text-blue-600 dark:text-blue-400" />}
                                       {lesson.is_locked ? "Locked" : "Unlocked"}
                                     </button>
                                   </div>

                                   <div className="flex items-center gap-1 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                                      <button onClick={() => setPreviewLesson(lesson)} className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm cursor-pointer" title="Preview Class"><Eye size={12} /></button>
                                      <button onClick={() => setLessonModal({ show: true, moduleId: module.id, isEditing: true, lessonId: lesson.id, initialData: lesson })} className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm cursor-pointer" title="Edit Class"><Edit2 size={12} /></button>
                                      <DeleteButton 
                                        id={lesson.id} 
                                        table="lessons" 
                                        title={lesson.title} 
                                        onSuccess={handleRefresh} 
                                        showText={false}
                                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 dark:hover:text-rose-455 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/30 transition-all shadow-sm cursor-pointer"
                                      />
                                   </div>
                                </div>
                              );
                            })}
                           </div>
                        </div>
                      )}

                      {(!module.lms_chapters || module.lms_chapters.length === 0) && (!module.lessons || module.lessons.length === 0) && (
                        <div className="py-10 text-center border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                           <p className="text-[10px] font-bold text-slate-350 dark:text-slate-550 uppercase tracking-widest">No chapters or topics added to this module yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="absolute left-1/2 -bottom-12 w-[2px] h-12 bg-slate-100 dark:bg-slate-800 group-last:hidden" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
