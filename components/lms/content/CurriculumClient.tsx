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
  Folder,
  FolderOpen,
  ChevronRight,
  FolderCode,
  Eye,
  Video,
  Award,
  EyeOff,
  Lock,
  Unlock,
  HelpCircle,
  Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Badge from "@/components/ui/Badge";
import dynamic from "next/dynamic";

const ModuleFormModal = dynamic(() => import("@/components/lms/admin/ModuleFormModal"), { ssr: false });
const ChapterFormModal = dynamic(() => import("@/components/lms/admin/ChapterFormModal"), { ssr: false });
const LessonFormModal = dynamic(() => import("@/components/lms/admin/LessonFormModal"), { ssr: false });
const LessonPreviewModal = dynamic(() => import("@/components/lms/admin/LessonPreviewModal"), { ssr: false });

const getClassCount = (lessons: any[] = []) => {
  return lessons.filter((l: any) => {
    const type = l.lesson_type || l.type || 'video';
    return type === 'video' || type === 'notes';
  }).length;
};

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
  const [showRoadmapMobile, setShowRoadmapMobile] = useState(false);
  const [currentMode, setCurrentMode] = useState<"global" | "batch">(mode);

  // Advanced Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'video' | 'notes' | 'assignment' | 'project' | 'mcq' | 'free' | 'locked'>('all');

  // Safety guardrail for reordering
  const reorderEnabled = !searchQuery.trim() && contentTypeFilter === 'all';

  // Modules filtered by batch
  const batchModules = useMemo(() => {
    return modules.map(mod => {
      // Filter chapters first
      const filteredChapters = (mod.lms_chapters || []).map((ch: any) => {
        if (currentMode === "batch" && selectedBatchId) {
          const isAssignedChapter = ch.batches?.includes(selectedBatchId);
          const isGlobalChapter = !ch.batches || ch.batches.length === 0;
          if (!isAssignedChapter && !isGlobalChapter) return null;
        } else if (currentMode === "global") {
          const isGlobalChapter = !ch.batches || ch.batches.length === 0;
          if (!isGlobalChapter) return null;
        }

        const totalLessonsInDb = ch.lessons?.length || 0;
        const filteredLessons = (ch.lessons || []).filter((l: any) => {
          if (currentMode === "batch" && selectedBatchId) {
            const isAssigned = l.batches?.includes(selectedBatchId);
            const isGlobal = !l.batches || l.batches.length === 0;
            return isAssigned || isGlobal;
          } else if (currentMode === "global") {
            return !l.batches || l.batches.length === 0;
          }
          return true;
        });

        // Hide chapter if it has lessons in DB but none are visible
        if (totalLessonsInDb > 0 && filteredLessons.length === 0) {
          return null;
        }

        return {
          ...ch,
          lessons: filteredLessons
        };
      }).filter(Boolean);

      // Filter direct lessons
      const filteredDirectLessons = (mod.lessons || []).filter((l: any) => {
        if (currentMode === "batch" && selectedBatchId) {
          const isAssigned = l.batches?.includes(selectedBatchId);
          const isGlobal = !l.batches || l.batches.length === 0;
          return isAssigned || isGlobal;
        } else if (currentMode === "global") {
          return !l.batches || l.batches.length === 0;
        }
        return true;
      });

      const moduleMatchesBatch = currentMode === "batch"
        ? (!selectedBatchId || !mod.batches || mod.batches.length === 0 || mod.batches.includes(selectedBatchId))
        : (!mod.batches || mod.batches.length === 0);

      if (moduleMatchesBatch) {
        return {
          ...mod,
          lms_chapters: filteredChapters,
          lessons: filteredDirectLessons
        };
      }
      return null;
    }).filter(Boolean);
  }, [modules, currentMode, selectedBatchId]);

  // Memoized curriculum statistics
  const stats = useMemo(() => {
    let totalModules = batchModules.length;
    let totalChapters = 0;
    let totalLessons = 0;
    let totalClasses = 0;
    let videosCount = 0;
    let notesCount = 0;
    let assignmentsCount = 0;
    let projectsCount = 0;
    let mcqsCount = 0;
    let freeCount = 0;
    let lockedCount = 0;

    batchModules.forEach(m => {
      totalChapters += m.lms_chapters?.length || 0;

      const directLessons = m.lessons || [];
      directLessons.forEach((l: any) => {
        totalLessons++;
        const type = l.lesson_type || l.type || 'video';
        if (type === 'video') {
          videosCount++;
          totalClasses++;
        }
        else if (type === 'notes') {
          notesCount++;
          totalClasses++;
        }
        else if (type === 'assignment') assignmentsCount++;
        else if (type === 'project') projectsCount++;
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
          if (type === 'video') {
            videosCount++;
            totalClasses++;
          }
          else if (type === 'notes') {
            notesCount++;
            totalClasses++;
          }
          else if (type === 'assignment') assignmentsCount++;
          else if (type === 'project') projectsCount++;
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
      totalClasses,
      videosCount,
      notesCount,
      assignmentsCount,
      projectsCount,
      mcqsCount,
      freeCount,
      lockedCount
    };
  }, [batchModules]);

  // Memoized dynamic curriculum filtering
  const filteredModules = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return batchModules.map(mod => {
      // Filter chapters first
      const filteredChapters = (mod.lms_chapters || []).map((ch: any) => {
        const filteredLessons = (ch.lessons || []).filter((l: any) => {
          const matchesQuery = !query || l.title?.toLowerCase().includes(query) || (l.lesson_type || l.type)?.toLowerCase().includes(query);
          if (!matchesQuery) return false;

          const lessonType = l.lesson_type || l.type || 'video';
          if (contentTypeFilter === 'video' && lessonType !== 'video') return false;
          if (contentTypeFilter === 'notes' && lessonType !== 'notes') return false;
          if (contentTypeFilter === 'assignment' && lessonType !== 'assignment') return false;
          if (contentTypeFilter === 'project' && lessonType !== 'project') return false;
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
        if (contentTypeFilter === 'project' && lessonType !== 'project') return false;
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
  }, [batchModules, searchQuery, contentTypeFilter]);

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteItem = async (id: string, table: "lms_modules" | "lms_chapters" | "lessons", itemTitle: string, itemData: any) => {
    const confirmDelete = confirm(`Are you sure you want to delete "${itemTitle}"?`);
    if (!confirmDelete) return;

    setDeletingId(id);
    try {
      if (currentMode === "global") {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;
      } else if (currentMode === "batch" && selectedBatchId) {
        const batchesList = itemData.batches || [];
        if (batchesList.length === 1 && batchesList[0] === selectedBatchId) {
          const { error } = await supabase.from(table).delete().eq("id", id);
          if (error) throw error;
        } else if (batchesList.length > 1) {
          const newBatches = batchesList.filter((bId: string) => bId !== selectedBatchId);
          const { error } = await supabase.from(table).update({ batches: newBatches }).eq("id", id);
          if (error) throw error;
        } else {
          // If global: exclude from this batch by explicitly assigning to all other batches of this course
          const otherBatches = availableBatches
            .filter((b: any) => b.course_id === currentCourseId && b.id !== selectedBatchId)
            .map((b: any) => b.id);
          
          const { error } = await supabase.from(table).update({ batches: otherBatches }).eq("id", id);
          if (error) throw error;
        }
      }
      handleRefresh();
    } catch (err: any) {
      console.error("Delete failed:", err);
      alert(err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const selectedBatchObj = useMemo(() => availableBatches.find(b => b.id === selectedBatchId), [availableBatches, selectedBatchId]);
  const currentCourseId = currentMode === "batch" ? (selectedBatchObj?.course_id || "") : selectedCourseId;
  const currentBatchName = currentMode === "batch" ? (selectedBatchObj?.type || null) : null;

  const courseBatches = useMemo(() => {
    return availableBatches.filter(b => b.course_id === selectedCourseId);
  }, [availableBatches, selectedCourseId]);

  // Sync mode & batch selection when course changes
  useEffect(() => {
    if (currentMode === "batch") {
      const filtered = availableBatches.filter(b => b.course_id === selectedCourseId);
      if (filtered.length > 0) {
        if (!filtered.some(b => b.id === selectedBatchId)) {
          setSelectedBatchId(filtered[0].id);
        }
      } else {
        setCurrentMode("global");
      }
    }
  }, [selectedCourseId, availableBatches, currentMode, selectedBatchId]);

  useEffect(() => {
    if (currentCourseId) {
      fetchModulesAndLessons(currentCourseId, currentBatchName);
    } else {
      setModules([]);
      setLoading(false);
    }
  }, [currentCourseId, currentBatchName, currentMode]);

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

    if (currentMode === "global") {
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
          const { error } = await supabase.from('lms_modules').upsert(updates);
          if (error) throw error;
        } else if (draggedItem.type === 'chapter') {
          // Resolve current parent module ID from modules list
          let foundModuleId = draggedItem.parentId;
          for (const m of modules) {
            if (m.lms_chapters?.some((c: any) => c.id === draggedItem.id)) {
              foundModuleId = m.id;
              break;
            }
          }

          if (foundModuleId) {
            const moduleObj = modules.find(m => m.id === foundModuleId);
            if (moduleObj) {
              const chapters = moduleObj.lms_chapters || [];
              const updates = chapters.map((c: any, idx: number) => ({
                id: c.id,
                order_index: idx + 1,
                module_id: foundModuleId,
                course_id: currentCourseId,
                title: c.title
              }));
              const { error } = await supabase.from('lms_chapters').upsert(updates);
              if (error) throw error;
            }
          }
        } else {
          // Lesson movement: locate where the lesson currently is
          let foundParentId: string | null = null;
          let foundModuleId: string | null = null;
          let isDirect = false;

          for (const m of modules) {
            if (m.lessons?.some((l: any) => l.id === draggedItem.id)) {
              foundParentId = m.id;
              foundModuleId = m.id;
              isDirect = true;
              break;
            }
            for (const c of (m.lms_chapters || [])) {
              if (c.lessons?.some((l: any) => l.id === draggedItem.id)) {
                foundParentId = c.id;
                foundModuleId = m.id;
                isDirect = false;
                break;
              }
            }
            if (foundParentId) break;
          }

          if (foundParentId && foundModuleId) {
            let lessonUpdates: any[] = [];
            if (isDirect) {
              const moduleWithDirectLesson = modules.find(m => m.id === foundParentId);
              if (moduleWithDirectLesson) {
                const lessons = moduleWithDirectLesson.lessons?.filter((l: any) => !l.chapter_id) || [];
                lessonUpdates = lessons.map((l: any, idx: number) => ({
                  id: l.id,
                  order_index: idx + 1,
                  module_id: foundParentId,
                  chapter_id: null,
                  course_id: currentCourseId,
                  title: l.title
                }));
              }
            } else {
              const chapterObj = modules.find(m => m.id === foundModuleId)?.lms_chapters?.find((c: any) => c.id === foundParentId);
              if (chapterObj) {
                const lessons = chapterObj.lessons || [];
                lessonUpdates = lessons.map((l: any, idx: number) => ({
                  id: l.id,
                  order_index: idx + 1,
                  module_id: foundModuleId,
                  chapter_id: foundParentId,
                  course_id: currentCourseId,
                  title: l.title
                }));
              }
            }

            if (lessonUpdates.length > 0) {
              const { error } = await supabase.from('lessons').upsert(lessonUpdates);
              if (error) throw error;
            }
          }
        }
        handleRefresh();
      } catch (err: any) {
        console.error("Error syncing drag order:", err);
        alert(`Failed to save new order: ${err.message || err}`);
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
    <div className={`space-y-5 transition-all duration-500 ${isFullScreen ? 'fixed inset-0 z-[100] bg-[#f8fafc] dark:bg-slate-950 p-8 overflow-y-auto' : ''}`}>

      {/* Lazy Modals */}
      {moduleModal.show && (
        <ModuleFormModal
          courseId={currentCourseId}
          batchName={currentBatchName}
          mode={currentMode}
          availableBatches={courseBatches}
          isEditing={moduleModal.isEditing}
          moduleId={moduleModal.moduleId}
          initialData={moduleModal.initialData}
          onClose={() => setModuleModal({ show: false, isEditing: false })}
          onSuccess={handleRefresh}
          currentModulesCount={modules.length}
          selectedBatchId={selectedBatchId}
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
          availableBatches={courseBatches}
          onClose={() => setLessonModal({ show: false, moduleId: "", isEditing: false, currentLessonsCount: 0 })}
          onSuccess={handleRefresh}
          currentLessonsCount={lessonModal.currentLessonsCount || 0}
          selectedBatchId={selectedBatchId}
          mode={currentMode}
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
          selectedBatchId={selectedBatchId}
          mode={currentMode}
          availableBatches={availableBatches}
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
      <div className="flex flex-col gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">{currentMode === "global" ? "Course Curriculum" : "Batch Content Manager"}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{currentMode === "global" ? "Design global course templates for all students." : "Manage specific content overrides for individual batches."}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModuleModal({ show: true, isEditing: false })}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Add module
            </button>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {/* Select Course Dropdown */}
          <label className="flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">Course</span>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus:border-slate-400 dark:focus:border-slate-600"
            >
              {initialCourses.map(course => (
                <option key={course.id} value={course.id} className="dark:bg-slate-900 dark:text-slate-200">{course.title}</option>
              ))}
            </select>
          </label>

          {/* Mode Selector */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentMode("global")}
              className={`pb-0.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                currentMode === "global"
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Global template
            </button>
            <button
              disabled={courseBatches.length === 0}
              onClick={() => {
                setCurrentMode("batch");
                if (courseBatches.length > 0 && !courseBatches.some(b => b.id === selectedBatchId)) {
                  setSelectedBatchId(courseBatches[0].id);
                }
              }}
              className={`pb-0.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                courseBatches.length === 0 ? "opacity-40 cursor-not-allowed" : ""
              } ${
                currentMode === "batch"
                  ? "border-slate-900 dark:border-white text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title={courseBatches.length === 0 ? "No batches active for this course" : "View batch specific overrides"}
            >
              Batch curriculum
            </button>
          </div>

          {/* Batch Selector Dropdown (if in Batch mode) */}
          {currentMode === "batch" && courseBatches.length > 0 && (
            <label className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">Batch</span>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 focus:border-slate-400 dark:focus:border-slate-600"
              >
                {courseBatches.map(batch => (
                  <option key={batch.id} value={batch.id} className="dark:bg-slate-900 dark:text-slate-200">{batch.type}</option>
                ))}
              </select>
            </label>
          )}

          {/* Linked Batches (if in Global mode) */}
          {currentMode === "global" && (
            <p className="text-xs text-slate-500 dark:text-slate-400 min-w-0 truncate">
              <span className="text-slate-400 dark:text-slate-500">Linked batches: </span>
              {courseBatches.length > 0
                ? courseBatches.map(b => b.type).join(", ")
                : <span className="text-amber-600 dark:text-amber-400">none active</span>}
            </p>
          )}
        </div>
      </div>

      {/* Curriculum Summary */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
          <button onClick={collapseAll} title="Click to collapse all modules" className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
            <span className="font-semibold text-slate-900 dark:text-white">{stats.totalModules}</span> modules
          </button>
          <button onClick={expandAll} title="Click to expand all modules" className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
            <span className="font-semibold text-slate-900 dark:text-white">{stats.totalChapters}</span> chapters
          </button>
          <button onClick={() => setContentTypeFilter('all')} title="Show all content types" className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
            <span className="font-semibold text-slate-900 dark:text-white">{stats.totalClasses}</span> classes
          </button>
        </div>

        {/* Filter by Type */}
        <div className="flex flex-wrap gap-1.5">
          {([
            ['video', 'Video', stats.videosCount],
            ['notes', 'Theory', stats.notesCount],
            ['assignment', 'Assignment', stats.assignmentsCount],
            ['project', 'Project', stats.projectsCount],
            ['mcq', 'Quiz', stats.mcqsCount],
            ['free', 'Free', stats.freeCount],
            ['locked', 'Locked', stats.lockedCount],
          ] as [string, string, number][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setContentTypeFilter((contentTypeFilter === key ? 'all' : key) as any)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                contentTypeFilter === key
                  ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {label} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">

        {/* Search Input */}
        <div className="relative w-full md:max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search modules, chapters, or classes..."
            className="w-full pl-9 pr-8 py-2 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter reset & Tree Controls */}
        <div className="flex flex-wrap items-center justify-end gap-4 w-full md:w-auto text-xs">
          {(searchQuery || contentTypeFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(""); setContentTypeFilter('all'); }}
              className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Clear all filters"
            >
              Clear filters <X size={12} />
            </button>
          )}
          <button onClick={expandAll} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Expand all</button>
          <button onClick={collapseAll} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Collapse all</button>
        </div>

      </div>

      {/* Main Content Layout */}
      <div className={`grid grid-cols-1 gap-8 ${isFullScreen ? 'col-span-1' : 'lg:grid-cols-12'}`}>

        {/* Module Sidebar Navigator */}
        {!isFullScreen && (
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden sticky top-24">
              <div 
                className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-800/80 flex items-center justify-between cursor-pointer lg:cursor-default select-none"
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setShowRoadmapMobile(!showRoadmapMobile);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Structure</h3>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform lg:hidden ${showRoadmapMobile ? 'rotate-180' : ''}`} />
                </div>
                <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-655 dark:text-slate-450 rounded-full">{filteredModules.length}</span>
              </div>
              <div className={`p-2 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-0.5 lg:block ${showRoadmapMobile ? 'block' : 'hidden'}`}>
                {filteredModules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => document.getElementById(module.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="w-full text-left px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                    title={module.title}
                  >
                    <Folder size={14} className="shrink-0 text-amber-500" />
                    <span className="flex-1 min-w-0 text-sm text-slate-700 dark:text-slate-300 truncate">{module.title}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">{getClassCount(module.lessons) + (module.lms_chapters?.reduce((sum: number, c: any) => sum + getClassCount(c.lessons), 0) || 0)}</span>
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setModuleModal({ show: true, isEditing: false })}
                  className="w-full py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Add New Module
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Builder Area */}
        <div className={`${isFullScreen ? 'col-span-1' : 'lg:col-span-9'} space-y-0.5 pb-20`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-widest animate-pulse">Building Curriculum Tree...</p>
            </div>
          ) : modules.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center gap-4">
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
            <div className="py-16 text-center flex flex-col items-center gap-4">
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
              >                 <div className="relative z-10">
                  <div className="py-1.5 pr-2 flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group/mhead">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleModule(module.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {reorderEnabled ? (
                          <GripVertical size={14} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0" onClick={(e) => e.stopPropagation()} />
                        ) : (
                          <div className="text-slate-300 dark:text-slate-700/60 p-0.5 shrink-0" title="Reordering disabled during filtering">
                            <Lock size={12} className="opacity-60" />
                          </div>
                        )}
                        <ChevronRight size={14} className={`shrink-0 text-slate-400 transition-transform ${isModuleExpanded(module.id) ? 'rotate-90' : ''}`} />
                        {isModuleExpanded(module.id)
                          ? <FolderOpen size={16} className="shrink-0 text-amber-500" />
                          : <Folder size={16} className="shrink-0 text-amber-500" />}
                        <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums shrink-0">{String(mIndex + 1).padStart(2, '0')}</span>
                        <h2 className="text-sm font-normal text-slate-800 dark:text-slate-200 truncate">{module.title}</h2>
                        <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {(module.lms_chapters?.length || 0)} chapters · {getClassCount(module.lessons) + (module.lms_chapters?.reduce((sum: number, c: any) => sum + getClassCount(c.lessons), 0) || 0)} classes
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover/mhead:opacity-100 focus-within:opacity-100 transition-opacity">
                      <div className="flex items-center gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); moveItem('module', module.id, 'up'); }} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors cursor-pointer" title="Move Up"><ArrowUp size={12} className="text-slate-500 dark:text-slate-400" /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveItem('module', module.id, 'down'); }} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors cursor-pointer" title="Move Down"><ArrowDown size={12} className="text-slate-500 dark:text-slate-400" /></button>
                      </div>

                      <button
                        onClick={() => setChapterModal({ show: true, moduleId: module.id, isEditing: false, currentChaptersCount: (module.lms_chapters?.length || 0) })}
                        className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Add Chapter to Module"
                      >
                        <FolderPlus size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setModuleModal({ show: true, isEditing: true, moduleId: module.id, initialData: module }); }}
                        className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Edit Module Name"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCopyToCourseModal({ show: true, module }); setTargetCourseId(currentCourseId); }}
                        className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Copy to Course"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(module.id, "lms_modules", module.title, module); }}
                        disabled={deletingId === module.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
                        title="Delete Module"
                      >
                        {deletingId === module.id ? (
                          <Loader2 size={16} className="animate-spin text-rose-500" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {isModuleExpanded(module.id) && (
                    <div className="ml-[15px] pl-3 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 space-y-0.5 py-0.5">

                      {/* Chapters Area */}
                      {module.lms_chapters && module.lms_chapters.length > 0 && (
                        <div className="space-y-0.5">
                          {[...module.lms_chapters].sort((a: any, b: any) => a.order_index - b.order_index).map((chapter: any, cIndex: number) => (
                            <div
                              key={chapter.id}
                              className="relative"
                              draggable={reorderEnabled}
                              onDragStart={(e) => { e.stopPropagation(); reorderEnabled && onDragStart(e, chapter.id, 'chapter', module.id); }}
                              onDragEnd={(e) => { e.stopPropagation(); onDragEnd(e); }}
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnter={(e) => { e.stopPropagation(); reorderEnabled && handleDragEnter(e, chapter.id, 'chapter', module.id); }}
                            >
                              {/* Chapter Header */}
                              <div
                                onClick={() => toggleChapter(chapter.id)}
                                className="py-1.5 pr-2 flex items-center justify-between cursor-pointer rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group/chheader"
                              >
                                <div className="flex items-center gap-2 min-w-0">
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
                                  <ChevronRight size={14} className={`shrink-0 text-slate-400 transition-transform ${isChapterExpanded(chapter.id) ? 'rotate-90' : ''}`} />
                                  {isChapterExpanded(chapter.id)
                                    ? <FolderOpen size={15} className="shrink-0 text-sky-500" />
                                    : <Folder size={15} className="shrink-0 text-sky-500" />}
                                  <h4 className="text-sm font-normal text-slate-700 dark:text-slate-300 truncate">{chapter.title}</h4>
                                  <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{getClassCount(chapter.lessons)} classes</span>
                                </div>
                                <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover/chheader:opacity-100 transition-opacity">
                                  <div className="h-4 w-[1px] bg-slate-100 dark:bg-slate-800 mx-0.5 sm:mx-1" />
                                  
                                  {/* Mobile-friendly Add Class button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLessonModal({
                                        show: true,
                                        moduleId: module.id,
                                        chapterId: chapter.id,
                                        isEditing: false,
                                        initialData: {}, // type selected in modal dropdown
                                        currentLessonsCount: (chapter.lessons?.length || 0)
                                      });
                                    }}
                                    className="md:hidden p-1.5 bg-blue-50 hover:bg-blue-105 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg transition-all flex items-center justify-center shrink-0"
                                    title="Add Class / Lesson"
                                  >
                                    <Plus size={14} />
                                  </button>

                                  {/* Desktop-only individual add buttons */}
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
                                    className="hidden md:flex p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded-lg cursor-pointer"
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
                                    className="hidden md:flex p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all rounded-lg cursor-pointer"
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
                                    className="hidden md:flex p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-500 hover:text-amber-605 dark:hover:text-amber-405 transition-all rounded-lg cursor-pointer"
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
                                        initialData: { type: 'project' },
                                        currentLessonsCount: (chapter.lessons?.length || 0)
                                      });
                                    }}
                                    className="hidden md:flex p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-lg cursor-pointer"
                                    title="Add Project"
                                  >
                                    <FolderCode size={14} />
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
                                    className="hidden md:flex p-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-all rounded-lg cursor-pointer"
                                    title="Add Quiz"
                                  >
                                    <HelpCircle size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); moveItem('chapter', chapter.id, 'up', module.id); }}
                                    className="p-1 sm:p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded-lg cursor-pointer"
                                    title="Move Chapter Up"
                                  >
                                    <ArrowUp size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); moveItem('chapter', chapter.id, 'down', module.id); }}
                                    className="p-1 sm:p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded-lg cursor-pointer"
                                    title="Move Chapter Down"
                                  >
                                    <ArrowDown size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setChapterModal({ show: true, moduleId: module.id, isEditing: true, chapterId: chapter.id, initialData: chapter, currentChaptersCount: module.lms_chapters.length }); }}
                                    className="p-1 sm:p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded-lg cursor-pointer"
                                    title="Edit Chapter"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(chapter.id, "lms_chapters", chapter.title, chapter)}
                                    disabled={deletingId === chapter.id}
                                    className="p-1 sm:p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 hover:text-rose-600 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 rounded-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                                    title="Delete Chapter"
                                  >
                                    {deletingId === chapter.id ? (
                                      <Loader2 size={14} className="animate-spin text-rose-500" />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Chapter Lessons */}
                              {isChapterExpanded(chapter.id) && (
                                <div className="ml-[14px] pl-3 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2">
                                  {(chapter.lessons || []).length === 0 ? (
                                    <div className="py-1.5 pl-2">
                                      <p className="text-xs text-slate-400 italic">No classes in this chapter</p>
                                    </div>
                                  ) : (
                                    (() => {
                                      let classCounter = 0;
                                      const sortedLessons = [...chapter.lessons].sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any) => {
                                        const lessonType = lesson.lesson_type || lesson.type || 'video';
                                        const isClass = lessonType === 'video' || lessonType === 'notes';
                                        if (isClass) {
                                          classCounter++;
                                          return { ...lesson, classIndex: classCounter };
                                        }
                                        return lesson;
                                      });
                                      return sortedLessons.map((lesson: any) => {
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
                                        } else if (lessonType === 'project') {
                                          TypeIcon = FolderCode;
                                          typeColor = 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400';
                                          typeLabel = 'Project';
                                        } else if (lessonType === 'mcq') {
                                          TypeIcon = HelpCircle;
                                          typeColor = 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400';
                                          typeLabel = 'Quiz';
                                        }

                                        return (
                                          <div
                                            key={lesson.id}
                                            className="group/lesson flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 px-2.5 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all cursor-pointer border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50"
                                            draggable={reorderEnabled}
                                            onDragStart={(e) => { e.stopPropagation(); reorderEnabled && onDragStart(e, lesson.id, 'lesson', chapter.id); }}
                                            onDragEnd={(e) => { e.stopPropagation(); onDragEnd(e); }}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDragEnter={(e) => { e.stopPropagation(); reorderEnabled && handleDragEnter(e, lesson.id, 'lesson', chapter.id); }}
                                            onClick={() => setLessonModal({ show: true, moduleId: module.id, chapterId: chapter.id, isEditing: true, lessonId: lesson.id, initialData: lesson })}
                                            title="Click to open lesson"
                                          >
                                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                              {reorderEnabled ? (
                                                <div onClick={(e) => e.stopPropagation()} className="cursor-grab shrink-0">
                                                  <GripVertical size={14} className="text-slate-300 dark:text-slate-700 group-hover/lesson:text-slate-500 shrink-0" />
                                                </div>
                                              ) : (
                                                <div className="text-slate-200 dark:text-slate-800/80 p-0.5 shrink-0" title="Reordering disabled during filtering">
                                                  <Lock size={10} className="opacity-60" />
                                                </div>
                                              )}
                                              <div className={`p-1.5 rounded-lg ${typeColor} shrink-0 group-hover/lesson:scale-105 transition-transform`}>
                                                <TypeIcon size={14} />
                                              </div>
                                              <div className="shrink-0 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                {lesson.classIndex ? `Class ${lesson.classIndex}` : lessonType === 'assignment' ? 'Assignment' : lessonType === 'project' ? 'Project' : 'Quiz'}
                                              </div>
                                              
                                              {/* Mobile Title - wraps inside the top row on mobile */}
                                              <div className="flex-1 min-w-0 sm:hidden">
                                                <h4 className="text-sm font-normal text-slate-700 dark:text-slate-300 group-hover/lesson:text-blue-600 dark:group-hover/lesson:text-blue-400 transition-colors truncate">{lesson.title}</h4>
                                              </div>
                                            </div>

                                            {/* Desktop Title & Badges */}
                                            <div className="hidden sm:block flex-1 min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-sm font-normal text-slate-700 dark:text-slate-300 group-hover/lesson:text-blue-600 dark:group-hover/lesson:text-blue-400 transition-colors truncate">{lesson.title}</h4>
                                                <span className={`text-[10px] text-slate-400 dark:text-slate-500`}>
                                                  {typeLabel}
                                                </span>
                                                {lesson.batches && lesson.batches.length > 0 && (
                                                  <div className="flex flex-wrap gap-1">
                                                    {lesson.batches.map((bid: string) => {
                                                      const b = availableBatches.find(x => x.id === bid);
                                                      if (!b) return null;
                                                      return (
                                                        <span key={bid} className="text-[10px] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 px-1.5 rounded">
                                                          {b.type}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Mobile Title Badges (stacked below the top row on mobile) */}
                                            <div className="sm:hidden px-9 space-y-1">
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`text-[10px] text-slate-400 dark:text-slate-500`}>
                                                  {typeLabel}
                                                </span>
                                                {lesson.batches && lesson.batches.length > 0 && (
                                                  <div className="flex flex-wrap gap-1">
                                                    {lesson.batches.map((bid: string) => {
                                                      const b = availableBatches.find(x => x.id === bid);
                                                      if (!b) return null;
                                                      return (
                                                        <span key={bid} className="text-[10px] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 px-1.5 rounded">
                                                          {b.type}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Action & Access Bar - stacked on mobile, row on desktop */}
                                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 mt-2 sm:mt-0 border-t border-slate-100/50 dark:border-slate-800/40 sm:border-none pt-2.5 sm:pt-0 pl-9 sm:pl-0">
                                              {/* Access Toggles */}
                                              <div className="flex items-center gap-1.5 select-none">
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); toggleLessonField(lesson.id, 'is_free', lesson.is_free); }}
                                                  className={`px-1.5 py-0.5 rounded-md border text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${lesson.is_free
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
                                                  className={`px-1.5 py-0.5 rounded-md border text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${lesson.is_locked
                                                    ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-455'
                                                    : 'bg-blue-50 hover:bg-blue-105 border-blue-200 text-blue-707 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400'
                                                    }`}
                                                  title={lesson.is_locked ? "Click to unlock class" : "Click to lock class"}
                                                >
                                                  {lesson.is_locked ? <Lock size={10} className="text-rose-600 dark:text-rose-455" /> : <Unlock size={10} className="text-blue-600 dark:text-blue-400" />}
                                                  {lesson.is_locked ? "Locked" : "Unlocked"}
                                                </button>
                                              </div>

                                              {/* Actions (Preview, Edit, Delete) - always visible on mobile, hover-only on desktop */}
                                              <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover/lesson:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); moveItem('lesson', lesson.id, 'up', chapter.id); }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer" title="Move Up"><ArrowUp size={12} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); moveItem('lesson', lesson.id, 'down', chapter.id); }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer" title="Move Down"><ArrowDown size={12} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setPreviewLesson(lesson); }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer" title="Preview Class"><Eye size={12} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setLessonModal({ show: true, moduleId: module.id, chapterId: chapter.id, isEditing: true, lessonId: lesson.id, initialData: lesson }); }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer" title="Edit Class"><Edit2 size={12} /></button>
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); handleDeleteItem(lesson.id, "lessons", lesson.title, lesson); }}
                                                  disabled={deletingId === lesson.id}
                                                  className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 dark:hover:text-rose-455 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/30 transition-all cursor-pointer disabled:opacity-50"
                                                  title="Delete Class"
                                                >
                                                  {deletingId === lesson.id ? (
                                                    <Loader2 size={12} className="animate-spin text-rose-500" />
                                                  ) : (
                                                    <Trash2 size={12} />
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()
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
                            {module.lessons.sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any, lIndex: number) => {
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
                              } else if (lessonType === 'project') {
                                TypeIcon = FolderCode;
                                typeColor = 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400';
                                typeLabel = 'Project';
                              } else if (lessonType === 'mcq') {
                                TypeIcon = HelpCircle;
                                typeColor = 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400';
                                typeLabel = 'Quiz';
                              }

                              return (
                                <div
                                  key={lesson.id}
                                  className="group/lesson flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 px-2.5 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-all cursor-pointer border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50"
                                  draggable={reorderEnabled}
                                  onDragStart={(e) => { e.stopPropagation(); reorderEnabled && onDragStart(e, lesson.id, 'lesson', module.id); }}
                                  onDragEnd={(e) => { e.stopPropagation(); onDragEnd(e); }}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDragEnter={(e) => { e.stopPropagation(); reorderEnabled && handleDragEnter(e, lesson.id, 'lesson', module.id); }}
                                  onClick={() => setLessonModal({ show: true, moduleId: module.id, isEditing: true, lessonId: lesson.id, initialData: lesson })}
                                  title="Click to open lesson"
                                >
                                  <div className="flex items-center gap-3 w-full sm:w-auto">
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
                                    <div className="shrink-0 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                      Class {lIndex + 1}
                                    </div>
                                    
                                    {/* Mobile Title - wraps inside the top row on mobile */}
                                    <div className="flex-1 min-w-0 sm:hidden">
                                      <h4 className="text-sm font-normal text-slate-700 dark:text-slate-300 truncate">{lesson.title}</h4>
                                    </div>
                                  </div>

                                  {/* Desktop Title & Badges */}
                                  <div className="hidden sm:block flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-sm font-normal text-slate-700 dark:text-slate-300 truncate">{lesson.title}</h4>
                                      <span className={`text-[10px] text-slate-400 dark:text-slate-500`}>
                                        {typeLabel}
                                      </span>
                                      {lesson.batches && lesson.batches.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {lesson.batches.map((bid: string) => {
                                            const b = availableBatches.find(x => x.id === bid);
                                            if (!b) return null;
                                            return (
                                              <span key={bid} className="text-[10px] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 px-1.5 rounded">
                                                {b.type}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Mobile Title Badges (stacked below the top row on mobile) */}
                                  <div className="sm:hidden px-9 space-y-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className={`text-[10px] text-slate-400 dark:text-slate-500`}>
                                        {typeLabel}
                                      </span>
                                      {lesson.batches && lesson.batches.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {lesson.batches.map((bid: string) => {
                                            const b = availableBatches.find(x => x.id === bid);
                                            if (!b) return null;
                                            return (
                                              <span key={bid} className="text-[10px] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 px-1.5 rounded">
                                                {b.type}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action & Access Bar - stacked on mobile, row on desktop */}
                                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 mt-2 sm:mt-0 border-t border-slate-100/50 dark:border-slate-800/40 sm:border-none pt-2.5 sm:pt-0 pl-9 sm:pl-0">
                                    {/* Access Toggles */}
                                    <div className="flex items-center gap-1.5 select-none">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleLessonField(lesson.id, 'is_free', lesson.is_free); }}
                                        className={`px-1.5 py-0.5 rounded-md border text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${lesson.is_free
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
                                        className={`px-1.5 py-0.5 rounded-md border text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${lesson.is_locked
                                          ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-455'
                                          : 'bg-blue-50 hover:bg-blue-105 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400'
                                          }`}
                                        title={lesson.is_locked ? "Click to unlock class" : "Click to lock class"}
                                      >
                                        {lesson.is_locked ? <Lock size={10} className="text-rose-600 dark:text-rose-455" /> : <Unlock size={10} className="text-blue-600 dark:text-blue-400" />}
                                        {lesson.is_locked ? "Locked" : "Unlocked"}
                                      </button>
                                    </div>

                                    {/* Actions (Preview, Edit, Delete) - always visible on mobile, hover-only on desktop */}
                                    <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover/lesson:opacity-100 transition-opacity">
                                      <button onClick={(e) => { e.stopPropagation(); moveItem('lesson', lesson.id, 'up', module.id); }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer" title="Move Up"><ArrowUp size={12} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); moveItem('lesson', lesson.id, 'down', module.id); }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer" title="Move Down"><ArrowDown size={12} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); setPreviewLesson(lesson); }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer" title="Preview Class"><Eye size={12} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); setLessonModal({ show: true, moduleId: module.id, isEditing: true, lessonId: lesson.id, initialData: lesson }); }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer" title="Edit Class"><Edit2 size={12} /></button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(lesson.id, "lessons", lesson.title, lesson); }}
                                        disabled={deletingId === lesson.id}
                                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 dark:hover:text-rose-455 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/30 transition-all cursor-pointer disabled:opacity-50"
                                        title="Delete Class"
                                      >
                                        {deletingId === lesson.id ? (
                                          <Loader2 size={12} className="animate-spin text-rose-500" />
                                        ) : (
                                          <Trash2 size={12} />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(!module.lms_chapters || module.lms_chapters.length === 0) && (!module.lessons || module.lessons.length === 0) && (
                        <div className="py-1.5 pl-2">
                          <p className="text-xs text-slate-400 italic">No chapters or topics added to this module yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
