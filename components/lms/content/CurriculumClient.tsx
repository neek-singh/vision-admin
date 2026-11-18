"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  Trash2,
  ListTree,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clipboard,
  Check,
  CornerDownLeft,
  CheckSquare,
  Square,
  Tag,
  BookmarkPlus,
  LayoutTemplate,
  Library,
  Download,
  Upload,
  History,
  Save,
  FileDown,
  FileUp,
  Code,
  RotateCcw
} from "lucide-react";
import { detectLessonType } from "@/lib/lms/curriculumParser";
import { supabase } from "@/lib/supabase";
import Badge from "@/components/ui/Badge";
import dynamic from "next/dynamic";

const ModuleFormModal = dynamic(() => import("@/components/lms/admin/ModuleFormModal"), { ssr: false });
const ChapterFormModal = dynamic(() => import("@/components/lms/admin/ChapterFormModal"), { ssr: false });
const LessonFormModal = dynamic(() => import("@/components/lms/admin/LessonFormModal"), { ssr: false });
const LessonPreviewModal = dynamic(() => import("@/components/lms/admin/LessonPreviewModal"), { ssr: false });
const CurriculumBulkImportModal = dynamic(() => import("@/components/lms/admin/CurriculumBulkImportModal"), { ssr: false });


export const isLessonContentReady = (l: any): boolean => {
  if (!l) return false;
  const type = l.lesson_type || l.type || 'video';
  if (type === 'video') {
    return Boolean(l.content_url && l.content_url.trim().length > 0);
  }
  if (type === 'notes') {
    if (!l.notes_content) return false;
    const stripped = l.notes_content.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 0 || l.notes_content.includes('<img');
  }
  if (type === 'assignment' || type === 'project') {
    return Boolean((l.content_url && l.content_url.trim().length > 0) || (l.pdf_url && l.pdf_url.trim().length > 0) || (l.notes_content && l.notes_content.replace(/<[^>]*>/g, '').trim().length > 0));
  }
  if (type === 'mcq') {
    return Boolean(l.notes_content && l.notes_content.includes('MCQ_QUESTIONS_JSON'));
  }
  return false;
};

export const getModuleContentStats = (mod: any) => {
  let total = 0;
  let ready = 0;

  (mod.lessons || []).forEach((l: any) => {
    total++;
    if (isLessonContentReady(l)) ready++;
  });

  (mod.lms_chapters || []).forEach((c: any) => {
    (c.lessons || []).forEach((l: any) => {
      total++;
      if (isLessonContentReady(l)) ready++;
    });
  });

  return { total, ready, percent: total > 0 ? Math.round((ready / total) * 100) : 0 };
};

export const getChapterContentStats = (ch: any) => {
  let total = 0;
  let ready = 0;

  (ch.lessons || []).forEach((l: any) => {
    total++;
    if (isLessonContentReady(l)) ready++;
  });

  return { total, ready, percent: total > 0 ? Math.round((ready / total) * 100) : 0 };
};

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

  const selectedBatchObj = useMemo(() => availableBatches.find(b => b.id === selectedBatchId), [availableBatches, selectedBatchId]);
  const currentCourseId = currentMode === "batch" ? (selectedBatchObj?.course_id || "") : selectedCourseId;
  const currentBatchName = currentMode === "batch" ? (selectedBatchObj?.type || null) : null;
  const currentCourseObj = useMemo(() => initialCourses.find(c => c.id === currentCourseId), [initialCourses, currentCourseId]);
  const currentCourseTitle = currentCourseObj?.title || "Course Curriculum";

  const courseBatches = useMemo(() => {
    return availableBatches.filter(b => b.course_id === selectedCourseId);
  }, [availableBatches, selectedCourseId]);

  // Advanced Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'video' | 'notes' | 'assignment' | 'project' | 'mcq' | 'free' | 'locked' | 'ready' | 'needs_content'>('all');

  // Quick Add State (Fast Inline Entry)
  const [quickAddTarget, setQuickAddTarget] = useState<{
    type: 'chapter' | 'module_chapter' | 'module_direct';
    id: string; // chapterId or moduleId
    moduleId?: string;
  } | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddType, setQuickAddType] = useState<'auto' | 'video' | 'notes' | 'assignment' | 'project' | 'mcq'>('auto');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  // AI Prompt Modal State
  const [aiPromptModal, setAiPromptModal] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Phase 2: Multi-select & Bulk Actions State
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // Phase 2: Curriculum Templates State
  const [templateModal, setTemplateModal] = useState<{ show: boolean; mode: 'use' | 'save' }>({ show: false, mode: 'use' });
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateForm, setTemplateForm] = useState({ title: "", description: "", category: "Computer & IT" });
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Phase 3: Shared Lesson Library State
  const [libraryModal, setLibraryModal] = useState<{
    show: boolean;
    targetModuleId?: string;
    targetChapterId?: string;
  }>({ show: false });
  const [libDestModuleId, setLibDestModuleId] = useState<string>("");
  const [libDestChapterId, setLibDestChapterId] = useState<string>("");
  const [libraryLessons, setLibraryLessons] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("all");
  const [isImportingLibraryLesson, setIsImportingLibraryLesson] = useState(false);

  // Phase 3: Curriculum Export / Import State
  const [exportImportModal, setExportImportModal] = useState<{ show: boolean; tab: 'export' | 'import' }>({ show: false, tab: 'export' });

  // Phase 3: Curriculum Snapshots / History State
  const [snapshotModal, setSnapshotModal] = useState(false);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);

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
    let readyCount = 0;
    let pendingCount = 0;

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

        if (isLessonContentReady(l)) {
          readyCount++;
        } else {
          pendingCount++;
        }
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

          if (isLessonContentReady(l)) {
            readyCount++;
          } else {
            pendingCount++;
          }
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
      lockedCount,
      readyCount,
      pendingCount
    };
  }, [batchModules]);

  // Memoized dynamic curriculum filtering
  const filteredModules = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return batchModules.map(mod => {
      // Filter chapters first
      const filteredChapters = (mod.lms_chapters || []).map((ch: any) => {
        const filteredLessons = (ch.lessons || []).filter((l: any) => {
          const cleanQuery = query.replace(/^#/, '');
          const tagsMatch = l.tags && Array.isArray(l.tags) && l.tags.some((t: string) => t.toLowerCase().includes(cleanQuery));
          const difficultyMatch = l.difficulty && l.difficulty.toLowerCase().includes(cleanQuery);
          const matchesQuery = !query || l.title?.toLowerCase().includes(query) || (l.lesson_type || l.type)?.toLowerCase().includes(query) || tagsMatch || difficultyMatch;
          if (!matchesQuery) return false;

          const lessonType = l.lesson_type || l.type || 'video';
          if (contentTypeFilter === 'video' && lessonType !== 'video') return false;
          if (contentTypeFilter === 'notes' && lessonType !== 'notes') return false;
          if (contentTypeFilter === 'assignment' && lessonType !== 'assignment') return false;
          if (contentTypeFilter === 'project' && lessonType !== 'project') return false;
          if (contentTypeFilter === 'mcq' && lessonType !== 'mcq') return false;
          if (contentTypeFilter === 'free' && !l.is_free) return false;
          if (contentTypeFilter === 'locked' && l.is_free) return false;
          if (contentTypeFilter === 'ready' && !isLessonContentReady(l)) return false;
          if (contentTypeFilter === 'needs_content' && isLessonContentReady(l)) return false;

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
        const cleanQuery = query.replace(/^#/, '');
        const tagsMatch = l.tags && Array.isArray(l.tags) && l.tags.some((t: string) => t.toLowerCase().includes(cleanQuery));
        const difficultyMatch = l.difficulty && l.difficulty.toLowerCase().includes(cleanQuery);
        const matchesQuery = !query || l.title?.toLowerCase().includes(query) || (l.lesson_type || l.type)?.toLowerCase().includes(query) || tagsMatch || difficultyMatch;
        if (!matchesQuery) return false;

        const lessonType = l.lesson_type || l.type || 'video';
        if (contentTypeFilter === 'video' && lessonType !== 'video') return false;
        if (contentTypeFilter === 'notes' && lessonType !== 'notes') return false;
        if (contentTypeFilter === 'assignment' && lessonType !== 'assignment') return false;
        if (contentTypeFilter === 'project' && lessonType !== 'project') return false;
        if (contentTypeFilter === 'mcq' && lessonType !== 'mcq') return false;
        if (contentTypeFilter === 'free' && !l.is_free) return false;
        if (contentTypeFilter === 'locked' && l.is_free) return false;
        if (contentTypeFilter === 'ready' && !isLessonContentReady(l)) return false;
        if (contentTypeFilter === 'needs_content' && isLessonContentReady(l)) return false;

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
  const [bulkImportModal, setBulkImportModal] = useState<{
    show: boolean;
    mode: "chapter_classes" | "module_tree";
    moduleId: string;
    chapterId?: string;
    chapterTitle?: string;
    moduleTitle?: string;
    currentCount?: number;
  }>({
    show: false,
    mode: "chapter_classes",
    moduleId: "",
  });
  const [copyToCourseModal, setCopyToCourseModal] = useState<{ show: boolean, module: any } | null>(null);
  const [targetCourseId, setTargetCourseId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  
  useEffect(() => {
    if (quickAddTarget) {
      setTimeout(() => {
        quickAddInputRef.current?.focus();
      }, 50);
    }
  }, [quickAddTarget]);

  // Fetch templates when templateModal is opened
  useEffect(() => {
    if (templateModal.show) {
      fetchTemplates();
    }
  }, [templateModal.show]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('curriculum_templates')
        .select('*')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Phase 3: Fetch Library Lessons
  useEffect(() => {
    if (libraryModal.show) {
      fetchLibraryLessons();
      setLibDestModuleId(libraryModal.targetModuleId || modules[0]?.id || "");
      setLibDestChapterId(libraryModal.targetChapterId || "");
    }
  }, [libraryModal.show, libraryModal.targetModuleId, libraryModal.targetChapterId, modules]);

  const fetchLibraryLessons = async () => {
    setLoadingLibrary(true);
    try {
      const { data, error } = await supabase
        .from('lesson_library')
        .select('*')
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLibraryLessons(data || []);
    } catch (err) {
      console.error("Error fetching library lessons:", err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  // Phase 3: Fetch Snapshots
  useEffect(() => {
    if (snapshotModal && currentCourseId) {
      fetchSnapshots();
    }
  }, [snapshotModal, currentCourseId]);

  const fetchSnapshots = async () => {
    if (!currentCourseId) return;
    setLoadingSnapshots(true);
    try {
      const { data, error } = await supabase
        .from('curriculum_snapshots')
        .select('*')
        .eq('course_id', currentCourseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSnapshots(data || []);
    } catch (err) {
      console.error("Error fetching snapshots:", err);
    } finally {
      setLoadingSnapshots(false);
    }
  };

  // Phase 1: Quick Add Handlers
  const handleQuickAddLesson = async (targetModuleId: string, targetChapterId?: string) => {
    const trimmedTitle = quickAddTitle.trim();
    if (!trimmedTitle || !currentCourseId) return;

    setIsQuickAdding(true);
    try {
      const detectedType = quickAddType === 'auto' ? detectLessonType(trimmedTitle) : quickAddType;
      let orderIndex = 1;
      const moduleObj = modules.find(m => m.id === targetModuleId);
      if (moduleObj) {
        if (targetChapterId) {
          const chapterObj = (moduleObj.lms_chapters || []).find((c: any) => c.id === targetChapterId);
          orderIndex = (chapterObj?.lessons?.length || 0) + 1;
        } else {
          orderIndex = (moduleObj.lessons?.length || 0) + 1;
        }
      }

      const targetBatches = currentMode === "batch" && selectedBatchId ? [selectedBatchId] : [];
      const payload = {
        course_id: currentCourseId,
        module_id: targetModuleId,
        chapter_id: targetChapterId || null,
        title: trimmedTitle,
        type: 'video', // DB constraint compatibility
        lesson_type: detectedType,
        order_index: orderIndex,
        batches: targetBatches,
        is_free: false,
        is_locked: false,
        content_url: "",
        notes_content: (detectedType === 'notes' || detectedType === 'assignment' || detectedType === 'project') ? "<p></p>" : ""
      };

      const { data, error } = await supabase.from('lessons').insert(payload).select().single();
      if (error) throw error;

      setModules(prev => prev.map(m => {
        if (m.id !== targetModuleId) return m;
        if (targetChapterId) {
          return {
            ...m,
            lms_chapters: (m.lms_chapters || []).map((c: any) => {
              if (c.id !== targetChapterId) return c;
              return {
                ...c,
                lessons: [...(c.lessons || []), data]
              };
            })
          };
        } else {
          return {
            ...m,
            lessons: [...(m.lessons || []), data]
          };
        }
      }));

      setQuickAddTitle("");
      setTimeout(() => {
        quickAddInputRef.current?.focus();
      }, 50);
    } catch (err: any) {
      console.error("Quick add class failed:", err);
      alert("Failed to add class: " + (err.message || err));
    } finally {
      setIsQuickAdding(false);
    }
  };

  const handleQuickAddChapter = async (targetModuleId: string) => {
    const trimmedTitle = quickAddTitle.trim();
    if (!trimmedTitle || !currentCourseId) return;

    setIsQuickAdding(true);
    try {
      const moduleObj = modules.find(m => m.id === targetModuleId);
      const orderIndex = ((moduleObj?.lms_chapters || []).length) + 1;
      const targetBatches = currentMode === "batch" && selectedBatchId ? [selectedBatchId] : [];

      const payload = {
        course_id: currentCourseId,
        module_id: targetModuleId,
        title: trimmedTitle,
        order_index: orderIndex,
        batches: targetBatches
      };

      const { data, error } = await supabase.from('lms_chapters').insert(payload).select('*, lessons(*)').single();
      if (error) throw error;

      setModules(prev => prev.map(m => {
        if (m.id !== targetModuleId) return m;
        return {
          ...m,
          lms_chapters: [...(m.lms_chapters || []), { ...data, lessons: [] }]
        };
      }));

      setExpandedChapters(prev => new Set(prev).add(data.id));
      setQuickAddTitle("");
      setQuickAddTarget(null);
    } catch (err: any) {
      console.error("Quick add chapter failed:", err);
      alert("Failed to add chapter: " + (err.message || err));
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Phase 2: Multi-select & Bulk Operations Handlers
  const toggleSelectLesson = (id: string) => {
    setSelectedLessonIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisibleLessons = () => {
    const ids = new Set<string>();
    filteredModules.forEach(m => {
      (m.lessons || []).forEach((l: any) => ids.add(l.id));
      (m.lms_chapters || []).forEach((c: any) => {
        (c.lessons || []).forEach((l: any) => ids.add(l.id));
      });
    });
    setSelectedLessonIds(ids);
  };

  const deselectAllLessons = () => {
    setSelectedLessonIds(new Set());
  };

  const handleBulkUpdate = async (field: 'is_locked' | 'is_free', value: boolean) => {
    if (selectedLessonIds.size === 0) return;
    setIsBulkOperating(true);
    try {
      const ids = Array.from(selectedLessonIds);
      const { error } = await supabase
        .from('lessons')
        .update({ [field]: value })
        .in('id', ids);
      if (error) throw error;

      setModules(prev => prev.map(m => {
        const updatedDirect = (m.lessons || []).map((l: any) =>
          selectedLessonIds.has(l.id) ? { ...l, [field]: value } : l
        );
        const updatedChapters = (m.lms_chapters || []).map((c: any) => ({
          ...c,
          lessons: (c.lessons || []).map((l: any) =>
            selectedLessonIds.has(l.id) ? { ...l, [field]: value } : l
          )
        }));
        return { ...m, lessons: updatedDirect, lms_chapters: updatedChapters };
      }));
    } catch (err: any) {
      console.error("Bulk update failed:", err);
      alert("Bulk update failed: " + (err.message || err));
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLessonIds.size === 0) return;
    const count = selectedLessonIds.size;
    if (!confirm(`Are you sure you want to permanently delete ${count} selected classes?`)) return;

    setIsBulkOperating(true);
    try {
      const ids = Array.from(selectedLessonIds);
      const { error } = await supabase.from('lessons').delete().in('id', ids);
      if (error) throw error;

      setModules(prev => prev.map(m => {
        const updatedDirect = (m.lessons || []).filter((l: any) => !selectedLessonIds.has(l.id));
        const updatedChapters = (m.lms_chapters || []).map((c: any) => ({
          ...c,
          lessons: (c.lessons || []).filter((l: any) => !selectedLessonIds.has(l.id))
        }));
        return { ...m, lessons: updatedDirect, lms_chapters: updatedChapters };
      }));

      setSelectedLessonIds(new Set());
    } catch (err: any) {
      console.error("Bulk delete failed:", err);
      alert("Bulk delete failed: " + (err.message || err));
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Phase 2: Template Handlers
  const handleSaveCurrentAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.title.trim()) return;

    setIsSavingTemplate(true);
    try {
      const templateData = modules.map(m => ({
        title: m.title,
        chapters: (m.lms_chapters || []).map((c: any) => ({
          title: c.title,
          lessons: (c.lessons || []).map((l: any) => ({
            title: l.title,
            lesson_type: l.lesson_type || l.type || 'video',
            content_url: l.content_url || "",
            notes_content: l.notes_content || "",
            difficulty: l.difficulty || 'beginner',
            tags: l.tags || []
          }))
        }))
      }));

      const { error } = await supabase.from('curriculum_templates').insert({
        title: templateForm.title.trim(),
        description: templateForm.description.trim() || null,
        category: templateForm.category || "General",
        template_data: templateData,
        is_system: false
      });
      if (error) throw error;

      alert(`Template "${templateForm.title}" saved successfully!`);
      setTemplateForm({ title: "", description: "", category: "Computer & IT" });
      setTemplateModal(prev => ({ ...prev, mode: 'use' }));
      fetchTemplates();
    } catch (err: any) {
      console.error("Error saving template:", err);
      alert("Error saving template: " + (err.message || err));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleApplyTemplate = async (template: any) => {
    if (!currentCourseId) return;
    const tData = template.template_data;
    if (!Array.isArray(tData) || tData.length === 0) {
      alert("This template has no modules.");
      return;
    }

    const confirmApply = confirm(`Apply template "${template.title}" to "${currentCourseTitle}"?\nThis will create ${tData.length} modules with all chapters and classes.`);
    if (!confirmApply) return;

    setIsApplyingTemplate(true);
    try {
      const targetBatches = currentMode === "batch" && selectedBatchId ? [selectedBatchId] : [];
      let startModOrder = modules.length + 1;

      for (const mod of tData) {
        const { data: newMod, error: modErr } = await supabase
          .from('lms_modules')
          .insert({
            course_id: currentCourseId,
            title: mod.title,
            order_index: startModOrder++,
            batches: targetBatches
          })
          .select()
          .single();
        if (modErr) throw modErr;

        const chapters = mod.chapters || [];
        let chapOrder = 1;
        for (const ch of chapters) {
          const { data: newChap, error: chErr } = await supabase
            .from('lms_chapters')
            .insert({
              course_id: currentCourseId,
              module_id: newMod.id,
              title: ch.title,
              order_index: chapOrder++,
              batches: targetBatches
            })
            .select()
            .single();
          if (chErr) throw chErr;

          const lessons = ch.lessons || [];
          if (lessons.length > 0) {
            const lessonPayloads = lessons.map((l: any, idx: number) => ({
              course_id: currentCourseId,
              module_id: newMod.id,
              chapter_id: newChap.id,
              title: l.title,
              type: 'video',
              lesson_type: l.lesson_type || 'video',
              content_url: l.content_url || "",
              notes_content: l.notes_content || (l.lesson_type === 'notes' ? "<p></p>" : ""),
              difficulty: l.difficulty || 'beginner',
              tags: l.tags || [],
              order_index: idx + 1,
              batches: targetBatches,
              is_free: false,
              is_locked: false
            }));

            const { error: lessErr } = await supabase.from('lessons').insert(lessonPayloads);
            if (lessErr) console.error("Lesson insert error:", lessErr);
          }
        }
      }

      setTemplateModal({ show: false, mode: 'use' });
      handleRefresh();
    } catch (err: any) {
      console.error("Error applying template:", err);
      alert("Error applying template: " + (err.message || err));
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  // Phase 3: Shared Lesson Library Handlers
  const handleImportFromLibrary = async (libLesson: any, destModuleId: string, destChapterId?: string) => {
    if (!currentCourseId || !destModuleId) {
      alert("Please select a target module to import into.");
      return;
    }

    setIsImportingLibraryLesson(true);
    try {
      const moduleObj = modules.find(m => m.id === destModuleId);
      let orderIndex = 1;
      if (moduleObj) {
        if (destChapterId) {
          const chapterObj = (moduleObj.lms_chapters || []).find((c: any) => c.id === destChapterId);
          orderIndex = (chapterObj?.lessons?.length || 0) + 1;
        } else {
          orderIndex = (moduleObj.lessons?.length || 0) + 1;
        }
      }

      const targetBatches = currentMode === "batch" && selectedBatchId ? [selectedBatchId] : [];
      const payload = {
        course_id: currentCourseId,
        module_id: destModuleId,
        chapter_id: destChapterId || null,
        title: libLesson.title,
        type: 'video',
        lesson_type: libLesson.lesson_type || 'video',
        content_url: libLesson.content_url || "",
        notes_content: libLesson.notes_content || "",
        difficulty: libLesson.difficulty || 'beginner',
        tags: libLesson.tags || [],
        order_index: orderIndex,
        batches: targetBatches,
        is_free: false,
        is_locked: false
      };

      const { data, error } = await supabase.from('lessons').insert(payload).select().single();
      if (error) throw error;

      await supabase
        .from('lesson_library')
        .update({ usage_count: (libLesson.usage_count || 0) + 1 })
        .eq('id', libLesson.id);

      setModules(prev => prev.map(m => {
        if (m.id !== destModuleId) return m;
        if (destChapterId) {
          return {
            ...m,
            lms_chapters: (m.lms_chapters || []).map((c: any) => {
              if (c.id !== destChapterId) return c;
              return { ...c, lessons: [...(c.lessons || []), data] };
            })
          };
        } else {
          return { ...m, lessons: [...(m.lessons || []), data] };
        }
      }));

      setLibraryModal({ show: false });
      alert(`Imported "${libLesson.title}" into course curriculum!`);
    } catch (err: any) {
      console.error("Error importing from library:", err);
      alert("Failed to import class: " + (err.message || err));
    } finally {
      setIsImportingLibraryLesson(false);
    }
  };

  const handleSaveLessonToLibrary = async (lesson: any) => {
    try {
      const { error } = await supabase.from('lesson_library').insert({
        title: lesson.title,
        description: null,
        lesson_type: lesson.lesson_type || lesson.type || 'video',
        content_url: lesson.content_url || "",
        notes_content: lesson.notes_content || "",
        tags: lesson.tags || [],
        difficulty: lesson.difficulty || 'beginner',
        category: "General"
      });
      if (error) throw error;
      alert(`"${lesson.title}" saved to Lesson Library! It can now be reused in any course.`);
    } catch (err: any) {
      console.error("Save to library failed:", err);
      alert("Failed to save to library: " + (err.message || err));
    }
  };

  // Phase 3: Curriculum Export Handlers
  const handleExportCSV = () => {
    if (modules.length === 0) {
      alert("No modules to export.");
      return;
    }

    const rows: string[][] = [
      ["Module", "Chapter", "Class Title", "Type", "Difficulty", "Tags", "Video URL", "Has Notes"]
    ];

    batchModules.forEach(m => {
      (m.lessons || []).forEach((l: any) => {
        rows.push([
          m.title,
          "-",
          l.title,
          l.lesson_type || l.type || "video",
          l.difficulty || "beginner",
          (l.tags || []).join("; "),
          l.content_url || "",
          l.notes_content ? "Yes" : "No"
        ]);
      });

      (m.lms_chapters || []).forEach((c: any) => {
        (c.lessons || []).forEach((l: any) => {
          rows.push([
            m.title,
            c.title,
            l.title,
            l.lesson_type || l.type || "video",
            l.difficulty || "beginner",
            (l.tags || []).join("; "),
            l.content_url || "",
            l.notes_content ? "Yes" : "No"
          ]);
        });
      });
    });

    const csvContent = "\uFEFF" + rows.map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = (currentCourseTitle || "Course").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `${safeTitle}_Curriculum.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (modules.length === 0) {
      alert("No modules to export.");
      return;
    }

    const exportData = {
      course: currentCourseTitle,
      exportedAt: new Date().toISOString(),
      modules: batchModules.map(m => ({
        title: m.title,
        subtitle: m.subtitle,
        chapters: (m.lms_chapters || []).map((c: any) => ({
          title: c.title,
          lessons: (c.lessons || []).map((l: any) => ({
            title: l.title,
            lesson_type: l.lesson_type || l.type || 'video',
            content_url: l.content_url || "",
            notes_content: l.notes_content || "",
            difficulty: l.difficulty || 'beginner',
            tags: l.tags || [],
            is_free: l.is_free || false
          }))
        })),
        direct_lessons: (m.lessons || []).map((l: any) => ({
          title: l.title,
          lesson_type: l.lesson_type || l.type || 'video',
          content_url: l.content_url || "",
          notes_content: l.notes_content || "",
          difficulty: l.difficulty || 'beginner',
          tags: l.tags || [],
          is_free: l.is_free || false
        }))
      }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = (currentCourseTitle || "Course").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `${safeTitle}_Curriculum.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Phase 3: Curriculum Snapshot Handlers
  const handleCreateSnapshot = async (title?: string) => {
    if (!currentCourseId || modules.length === 0) {
      alert("Nothing to snapshot in current course.");
      return;
    }

    setIsCreatingSnapshot(true);
    try {
      const snapTitle = title || `Backup - ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const snapshotPayload = {
        course_id: currentCourseId,
        title: snapTitle,
        snapshot_data: modules
      };

      const { error } = await supabase.from('curriculum_snapshots').insert(snapshotPayload);
      if (error) throw error;

      fetchSnapshots();
      alert(`Snapshot "${snapTitle}" created successfully!`);
    } catch (err: any) {
      console.error("Snapshot creation error:", err);
      alert("Failed to create snapshot: " + (err.message || err));
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (snapshot: any) => {
    if (!currentCourseId) return;
    const confirmRestore = confirm(`Restore curriculum from snapshot "${snapshot.title}"?\nThis will revert course curriculum to that backup point.`);
    if (!confirmRestore) return;

    setIsRestoringSnapshot(true);
    try {
      await supabase.from('curriculum_snapshots').insert({
        course_id: currentCourseId,
        title: `Auto-Backup before restoring "${snapshot.title}"`,
        snapshot_data: modules
      });

      await supabase.from('lms_modules').delete().eq('course_id', currentCourseId);

      const sData = snapshot.snapshot_data;
      if (Array.isArray(sData)) {
        for (const mod of sData) {
          const { data: newMod, error: modErr } = await supabase
            .from('lms_modules')
            .insert({
              course_id: currentCourseId,
              title: mod.title,
              subtitle: mod.subtitle,
              order_index: mod.order_index || 1,
              batches: mod.batches || []
            })
            .select()
            .single();
          if (modErr) throw modErr;

          for (const ch of (mod.lms_chapters || [])) {
            const { data: newChap, error: chErr } = await supabase
              .from('lms_chapters')
              .insert({
                course_id: currentCourseId,
                module_id: newMod.id,
                title: ch.title,
                order_index: ch.order_index || 1,
                batches: ch.batches || []
              })
              .select()
              .single();
            if (chErr) throw chErr;

            const chLessons = ch.lessons || [];
            if (chLessons.length > 0) {
              const lessonPayloads = chLessons.map((l: any, idx: number) => ({
                course_id: currentCourseId,
                module_id: newMod.id,
                chapter_id: newChap.id,
                title: l.title,
                type: 'video',
                lesson_type: l.lesson_type || l.type || 'video',
                content_url: l.content_url || "",
                notes_content: l.notes_content || "",
                difficulty: l.difficulty || 'beginner',
                tags: l.tags || [],
                order_index: l.order_index || (idx + 1),
                batches: l.batches || [],
                is_free: l.is_free || false,
                is_locked: l.is_locked || false
              }));
              await supabase.from('lessons').insert(lessonPayloads);
            }
          }

          const directLessons = mod.lessons || [];
          if (directLessons.length > 0) {
            const directPayloads = directLessons.map((l: any, idx: number) => ({
              course_id: currentCourseId,
              module_id: newMod.id,
              chapter_id: null,
              title: l.title,
              type: 'video',
              lesson_type: l.lesson_type || l.type || 'video',
              content_url: l.content_url || "",
              notes_content: l.notes_content || "",
              difficulty: l.difficulty || 'beginner',
              tags: l.tags || [],
              order_index: l.order_index || (idx + 1),
              batches: l.batches || [],
              is_free: l.is_free || false,
              is_locked: l.is_locked || false
            }));
            await supabase.from('lessons').insert(directPayloads);
          }
        }
      }

      setSnapshotModal(false);
      handleRefresh();
      alert("Curriculum restored successfully!");
    } catch (err: any) {
      console.error("Restore failed:", err);
      alert("Failed to restore: " + (err.message || err));
    } finally {
      setIsRestoringSnapshot(false);
    }
  };

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

      {bulkImportModal.show && (
        <CurriculumBulkImportModal
          isOpen={bulkImportModal.show}
          onClose={() => setBulkImportModal(prev => ({ ...prev, show: false }))}
          onSuccess={handleRefresh}
          mode={bulkImportModal.mode}
          courseId={currentCourseId}
          moduleId={bulkImportModal.moduleId}
          chapterId={bulkImportModal.chapterId}
          chapterTitle={bulkImportModal.chapterTitle}
          moduleTitle={bulkImportModal.moduleTitle}
          currentCount={bulkImportModal.currentCount || 0}
          currentMode={currentMode}
          selectedBatchId={selectedBatchId}
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

      
      {/* AI Syllabus Generator Modal */}
      {aiPromptModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[115] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">AI Syllabus Outline Generator</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Copy optimized prompt for ChatGPT, Claude, or Gemini</p>
                </div>
              </div>
              <button
                onClick={() => setAiPromptModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap select-all max-h-56 overflow-y-auto">
{`Please act as an expert curriculum designer. Design a comprehensive, industry-aligned syllabus outline for the course "${currentCourseTitle}".

Format output using this exact text structure so it can be automatically imported into our LMS:

Module: [Module 1 Title]
- Chapter: [Chapter 1 Title]
  * [Class 1 Title] (video)
  * [Class 2 Title] (video)
  * [Class 3 Title] (notes)
  * [Class 4 Title] (assignment)
  * [Class 5 Title] (quiz)
- Chapter: [Chapter 2 Title]
  * [Class 1 Title] (video)
  * [Class 2 Title] (notes)

Module: [Module 2 Title]
- Chapter: [Chapter 1 Title]
  * [Class 1 Title] (video)

Rules:
1. Provide practical, progressive topics from beginner to advanced.
2. Mark hands-on theory as (notes), assignments as (assignment), and tests as (quiz).
3. Do not include markdown tables, only the plain bulleted hierarchy above.`}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const promptText = `Please act as an expert curriculum designer. Design a comprehensive, industry-aligned syllabus outline for the course "${currentCourseTitle}".\n\nFormat output using this exact text structure so it can be automatically imported into our LMS:\n\nModule: [Module 1 Title]\n- Chapter: [Chapter 1 Title]\n  * [Class 1 Title] (video)\n  * [Class 2 Title] (video)\n  * [Class 3 Title] (notes)\n  * [Class 4 Title] (assignment)\n  * [Class 5 Title] (quiz)\n- Chapter: [Chapter 2 Title]\n  * [Class 1 Title] (video)\n  * [Class 2 Title] (notes)\n\nModule: [Module 2 Title]\n- Chapter: [Chapter 1 Title]\n  * [Class 1 Title] (video)\n\nRules:\n1. Provide practical, progressive topics from beginner to advanced.\n2. Mark hands-on theory as (notes), assignments as (assignment), and tests as (quiz).\n3. Do not include markdown tables, only the plain bulleted hierarchy above.`;
                    navigator.clipboard.writeText(promptText);
                    setCopiedPrompt(true);
                    setTimeout(() => setCopiedPrompt(false), 2000);
                  }}
                  className="w-full sm:flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  {copiedPrompt ? <Check size={14} className="text-emerald-300" /> : <Clipboard size={14} />}
                  <span>{copiedPrompt ? "Copied Prompt!" : "Copy Prompt to Clipboard"}</span>
                </button>

                {modules.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAiPromptModal(false);
                      setBulkImportModal({
                        show: true,
                        mode: "module_tree",
                        moduleId: modules[0].id,
                        moduleTitle: modules[0].title,
                        currentCount: modules[0].lms_chapters?.length || 0,
                      });
                    }}
                    className="w-full sm:flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ListTree size={14} />
                    <span>Open Bulk Import</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Curriculum Templates Modal */}
      {templateModal.show && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[115] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <LayoutTemplate size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Curriculum Templates & Blueprints</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Apply standard syllabus patterns or export current course as reusable blueprint.</p>
                </div>
              </div>
              <button
                onClick={() => setTemplateModal({ show: false, mode: 'use' })}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
              <button
                type="button"
                onClick={() => setTemplateModal(prev => ({ ...prev, mode: 'use' }))}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                  templateModal.mode === 'use'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-slate-800/60'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Browse Templates ({templates.length})
              </button>
              <button
                type="button"
                onClick={() => setTemplateModal(prev => ({ ...prev, mode: 'save' }))}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                  templateModal.mode === 'save'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-slate-800/60'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Save Current Course as Template
              </button>
            </div>

            <div className="overflow-y-auto p-5 flex-1 space-y-4">
              {templateModal.mode === 'use' ? (
                <>
                  {loadingTemplates ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 size={24} className="animate-spin text-indigo-500" />
                      <p className="text-xs">Loading curriculum templates...</p>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-10 space-y-3">
                      <p className="text-sm text-slate-500">No templates found in library yet.</p>
                      <button
                        onClick={() => setTemplateModal(prev => ({ ...prev, mode: 'save' }))}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold underline cursor-pointer"
                      >
                        Save current course as the first template &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {templates.map(tmpl => {
                        const moduleCount = tmpl.template_data?.length || 0;
                        const classCount = (tmpl.template_data || []).reduce((acc: number, m: any) => {
                          const chapClasses = (m.chapters || []).reduce((cAcc: number, c: any) => cAcc + (c.lessons?.length || 0), 0);
                          return acc + chapClasses;
                        }, 0);

                        return (
                          <div
                            key={tmpl.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800/60 transition-all bg-white dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                  {tmpl.title}
                                </h4>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {tmpl.category || "General"}
                                </span>
                                {tmpl.is_system && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                                    Pre-built
                                  </span>
                                )}
                              </div>
                              {tmpl.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                  {tmpl.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                                <span className="font-medium text-slate-700 dark:text-slate-300">{moduleCount} Modules</span>
                                <span>&bull;</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{classCount} Classes</span>
                                {tmpl.template_data && tmpl.template_data.length > 0 && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="truncate max-w-[220px]">
                                      Includes: {tmpl.template_data.slice(0, 3).map((m: any) => m.title).join(", ")}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplyTemplate(tmpl)}
                              disabled={isApplyingTemplate}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-indigo-500/20 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isApplyingTemplate ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Plus size={13} />
                              )}
                              <span>Apply to Course</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleSaveCurrentAsTemplate} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Template Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={templateForm.title}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={`e.g. ${currentCourseTitle} Standard Syllabus`}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Category
                    </label>
                    <select
                      value={templateForm.category}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                    >
                      <option value="Computer & IT">Computer & IT</option>
                      <option value="Programming & Web">Programming & Web</option>
                      <option value="Accounting & Finance">Accounting & Finance</option>
                      <option value="Design & Multimedia">Design & Multimedia</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief note on what this template covers and for which target students..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 resize-none"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Source Curriculum Summary:
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Course: <span className="font-medium text-slate-700 dark:text-slate-300">{currentCourseTitle}</span>
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Content to capture: <span className="font-medium text-slate-700 dark:text-slate-300">{modules.length} Modules &bull; {stats.totalChapters} Chapters &bull; {stats.totalClasses} Classes</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setTemplateModal(prev => ({ ...prev, mode: 'use' }))}
                      className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingTemplate || modules.length === 0}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingTemplate ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <BookmarkPlus size={13} />
                      )}
                      <span>Save Blueprint</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phase 3: Shared Lesson Library Modal */}
      {libraryModal.show && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[115] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Library size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Shared Lesson Library</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Browse and reuse pre-made classes across all courses.</p>
                </div>
              </div>
              <button
                onClick={() => setLibraryModal({ show: false })}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/30 dark:bg-slate-900/30">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Insert Destination:</span>
                <div className="flex items-center gap-2">
                  <label className="text-slate-400">Module:</label>
                  <select
                    value={libDestModuleId}
                    onChange={(e) => {
                      setLibDestModuleId(e.target.value);
                      setLibDestChapterId("");
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-xs"
                  >
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const currentMod = modules.find(m => m.id === libDestModuleId);
                  const chaps = currentMod?.lms_chapters || [];
                  if (chaps.length === 0) return null;
                  return (
                    <div className="flex items-center gap-2">
                      <label className="text-slate-400">Chapter:</label>
                      <select
                        value={libDestChapterId}
                        onChange={(e) => setLibDestChapterId(e.target.value)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-xs"
                      >
                        <option value="">Direct in module</option>
                        {chaps.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search classes by title, tag (#excel), or topic..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-emerald-500"
                  />
                  {librarySearch && (
                    <button onClick={() => setLibrarySearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {['all', 'Computer & IT', 'Office Automation', 'Web & Programming', 'Accounting & Finance'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setLibraryCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                        libraryCategory === cat
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {cat === 'all' ? 'All Categories' : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-y-auto p-4 flex-1 space-y-2.5">
              {loadingLibrary ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={24} className="animate-spin text-emerald-500" />
                  <p className="text-xs">Loading library classes...</p>
                </div>
              ) : (() => {
                const query = librarySearch.toLowerCase().trim();
                const filtered = libraryLessons.filter(item => {
                  const matchesCat = libraryCategory === 'all' || item.category === libraryCategory;
                  const matchesQ = !query || 
                    item.title?.toLowerCase().includes(query) ||
                    item.description?.toLowerCase().includes(query) ||
                    (Array.isArray(item.tags) && item.tags.some((t: string) => t.toLowerCase().includes(query)));
                  return matchesCat && matchesQ;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-400 space-y-2">
                      <p className="text-xs">No library classes matching your search.</p>
                      <p className="text-[11px] text-slate-500">You can save any class into this library using the "Save to Library" button in Lesson Form or row actions.</p>
                    </div>
                  );
                }

                return filtered.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                          {item.lesson_type || 'video'}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </h4>
                        {item.difficulty && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium capitalize bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.difficulty}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {item.category || "General"}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {Array.isArray(item.tags) && item.tags.map((t: string, idx: number) => (
                          <span key={idx} className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                            #{t}
                          </span>
                        ))}
                        {item.usage_count > 0 && (
                          <span className="text-[10px] text-indigo-500 font-medium">
                            &bull; Used {item.usage_count} times
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleImportFromLibrary(item, libDestModuleId, libDestChapterId || undefined)}
                      disabled={isImportingLibraryLesson || !libDestModuleId}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-emerald-500/20 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isImportingLibraryLesson ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      <span>Add to Course</span>
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Phase 3: Curriculum Export / Import Modal */}
      {exportImportModal.show && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[115] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <Download size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Export & Import Curriculum</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{currentCourseTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setExportImportModal({ show: false, tab: 'export' })}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-emerald-500" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Excel / CSV Spreadsheet</h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Export all {stats.totalModules} modules and {stats.totalClasses} classes into a spreadsheet-ready CSV.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download CSV</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Code size={16} className="text-indigo-500" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Full JSON Curriculum Tree</h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Complete nested data with all markdown notes, quiz structures, and configuration.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-indigo-500/20 shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download JSON</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ListTree size={16} className="text-amber-500" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Text / AI Tree Bulk Import</h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Paste a ChatGPT outline, syllabus text, or directory tree to auto-create chapters & classes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExportImportModal({ show: false, tab: 'export' });
                      setBulkImportModal({
                        show: true,
                        mode: "module_tree",
                        moduleId: modules[0]?.id || "",
                        moduleTitle: modules[0]?.title || "",
                        currentCount: modules[0]?.lms_chapters?.length || 0,
                      });
                    }}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-amber-500/20 shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>Open Importer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3: Curriculum Snapshots & Version History Modal */}
      {snapshotModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[115] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Curriculum Snapshots & Safety Backups</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{currentCourseTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setSnapshotModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create a point-in-time snapshot before making major changes.
              </p>
              <button
                type="button"
                onClick={() => handleCreateSnapshot()}
                disabled={isCreatingSnapshot || modules.length === 0}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-purple-500/20 cursor-pointer disabled:opacity-50"
              >
                {isCreatingSnapshot ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Create Snapshot</span>
              </button>
            </div>

            <div className="overflow-y-auto p-4 flex-1 space-y-2.5">
              {loadingSnapshots ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={24} className="animate-spin text-purple-500" />
                  <p className="text-xs">Loading course backups...</p>
                </div>
              ) : snapshots.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <p className="text-xs">No saved snapshots for this course yet.</p>
                  <p className="text-[11px] text-slate-500">Click "Create Snapshot" above to create your first safety backup.</p>
                </div>
              ) : (
                snapshots.map(snap => {
                  const snapModuleCount = snap.snapshot_data?.length || 0;
                  return (
                    <div
                      key={snap.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-purple-300 dark:hover:border-purple-800 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {snap.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{new Date(snap.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <span>&bull;</span>
                          <span className="font-medium text-slate-600 dark:text-slate-300">{snapModuleCount} Modules</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(snap)}
                        disabled={isRestoringSnapshot}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Restore course to this backup point"
                      >
                        {isRestoringSnapshot ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        <span>Restore</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLibraryModal({ show: true })}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Shared Lesson Library (Reusable classes across all courses)"
            >
              <Library size={14} className="text-emerald-500" />
              <span>Library</span>
            </button>
            <button
              onClick={() => setExportImportModal({ show: true, tab: 'export' })}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Export to CSV/Excel or JSON, or Import from file"
            >
              <Download size={14} className="text-blue-500" />
              <span>Export/Import</span>
            </button>
            <button
              onClick={() => setSnapshotModal(true)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Curriculum Version Backups & Restore points"
            >
              <History size={14} className="text-purple-500" />
              <span>Snapshots</span>
            </button>
            <button
              onClick={() => setTemplateModal({ show: true, mode: 'use' })}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Curriculum Templates (Pre-built syllabus & saved blueprints)"
            >
              <LayoutTemplate size={14} className="text-indigo-500" />
              <span>Templates</span>
            </button>
            <button
              onClick={() => setAiPromptModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
              title="Generate syllabus outline with AI (ChatGPT / Gemini)"
            >
              <Sparkles size={14} className="text-amber-300" />
              <span>AI Syllabus Helper</span>
            </button>
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

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          {/* Content Completion Filters */}
          <button
            onClick={() => setContentTypeFilter((contentTypeFilter === 'ready' ? 'all' : 'ready') as any)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
              contentTypeFilter === 'ready'
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            <CheckCircle2 size={11} />
            <span>Has Content</span>
            <span className="opacity-70 font-semibold">{stats.readyCount}</span>
          </button>

          <button
            onClick={() => setContentTypeFilter((contentTypeFilter === 'needs_content' ? 'all' : 'needs_content') as any)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
              contentTypeFilter === 'needs_content'
                ? 'bg-amber-600 border-amber-600 text-white'
                : 'border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            }`}
          >
            <AlertCircle size={11} />
            <span>Needs Content</span>
            <span className="opacity-70 font-semibold">{stats.pendingCount}</span>
          </button>
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
            placeholder="Search modules, chapters, classes, tags (#tag), or difficulty..."
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

        {/* Filter reset & Multi-select & Tree Controls */}
        <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto text-xs">
          <button
            type="button"
            onClick={selectedLessonIds.size > 0 ? deselectAllLessons : selectAllVisibleLessons}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              selectedLessonIds.size > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
            title={selectedLessonIds.size > 0 ? "Clear selection" : "Select all visible classes"}
          >
            {selectedLessonIds.size > 0 ? <CheckSquare size={13} className="text-blue-600 dark:text-blue-400" /> : <Square size={13} />}
            <span>{selectedLessonIds.size > 0 ? `Selected (${selectedLessonIds.size})` : "Select All"}</span>
          </button>
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
                        {(() => {
                          const modStats = getModuleContentStats(module);
                          if (modStats.total === 0) return null;
                          return (
                            <span
                              className={`hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                modStats.ready === modStats.total
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                              }`}
                              title={`${modStats.ready} of ${modStats.total} classes ready (${modStats.percent}%)`}
                            >
                              {modStats.ready === modStats.total ? (
                                <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <AlertCircle size={11} className="text-amber-500 dark:text-amber-400" />
                              )}
                              <span>{modStats.percent}% ready</span>
                            </span>
                          );
                        })()}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setBulkImportModal({
                            show: true,
                            mode: "module_tree",
                            moduleId: module.id,
                            moduleTitle: module.title,
                            currentCount: (module.lms_chapters?.length || 0),
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Bulk Import Chapters & Classes Tree"
                      >
                        <ListTree size={16} />
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
                                  {(() => {
                                    const chStats = getChapterContentStats(chapter);
                                    if (chStats.total === 0) return null;
                                    return (
                                      <span
                                        className={`hidden sm:inline-flex text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                          chStats.ready === chStats.total
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                        }`}
                                        title={`${chStats.ready} of ${chStats.total} classes ready`}
                                      >
                                        {chStats.ready}/{chStats.total} ready
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover/chheader:opacity-100 transition-opacity">
                                  <div className="h-4 w-[1px] bg-slate-100 dark:bg-slate-800 mx-0.5 sm:mx-1" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLibraryModal({ show: true, targetModuleId: module.id, targetChapterId: chapter.id });
                                    }}
                                    className="hidden sm:flex p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all rounded-lg cursor-pointer"
                                    title="Import from Lesson Library"
                                  >
                                    <Library size={14} />
                                  </button>
                                  
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBulkImportModal({
                                        show: true,
                                        mode: "chapter_classes",
                                        moduleId: module.id,
                                        chapterId: chapter.id,
                                        chapterTitle: chapter.title,
                                        moduleTitle: module.title,
                                        currentCount: (chapter.lessons?.length || 0),
                                      });
                                    }}
                                    className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded-lg cursor-pointer flex items-center justify-center shrink-0"
                                    title="Bulk Import Classes (Paste Outline / ChatGPT)"
                                  >
                                    <FileSpreadsheet size={14} />
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
                                            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                              <div
                                                onClick={(e) => { e.stopPropagation(); toggleSelectLesson(lesson.id); }}
                                                className="p-1 cursor-pointer shrink-0 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                                                title={selectedLessonIds.has(lesson.id) ? "Deselect class" : "Select class for bulk actions"}
                                              >
                                                {selectedLessonIds.has(lesson.id) ? (
                                                  <CheckSquare size={14} className="text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                  <Square size={14} className="text-slate-300 dark:text-slate-600 hover:text-slate-500" />
                                                )}
                                              </div>
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
                                                {isLessonContentReady(lesson) ? (
                                                  <span className="shrink-0 text-emerald-500" title="Content Ready">
                                                    <CheckCircle2 size={13} />
                                                  </span>
                                                ) : (
                                                  <span className="shrink-0 text-amber-500" title="Content Pending (No video link or notes)">
                                                    <AlertCircle size={13} />
                                                  </span>
                                                )}
                                                <h4 className="text-sm font-normal text-slate-700 dark:text-slate-300 group-hover/lesson:text-blue-600 dark:group-hover/lesson:text-blue-400 transition-colors truncate">{lesson.title}</h4>
                                                {lesson.difficulty && lesson.difficulty !== 'beginner' && (
                                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                                    lesson.difficulty === 'advanced'
                                                      ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40'
                                                      : 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                                                  }`}>
                                                    {lesson.difficulty}
                                                  </span>
                                                )}
                                                {lesson.tags && lesson.tags.length > 0 && (
                                                  <div className="flex flex-wrap gap-1">
                                                    {lesson.tags.slice(0, 3).map((tag: string, tidx: number) => (
                                                      <span key={tidx} className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded flex items-center gap-0.5">
                                                        <Tag size={8} className="opacity-60" />
                                                        {tag}
                                                      </span>
                                                    ))}
                                                    {lesson.tags.length > 3 && (
                                                      <span className="text-[10px] text-slate-400">+{lesson.tags.length - 3}</span>
                                                    )}
                                                  </div>
                                                )}
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
                                                <button onClick={(e) => { e.stopPropagation(); handleSaveLessonToLibrary(lesson); }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer" title="Save to Shared Library"><BookmarkPlus size={12} /></button>
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

                                  {/* Quick Add Class Inline Row & From Library */}
                                  <div className="pt-2 pb-1 pl-2">
                                    {quickAddTarget?.type === 'chapter' && quickAddTarget?.id === chapter.id ? (
                                      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-blue-200 dark:border-blue-900/50 animate-in fade-in">
                                        <input
                                          type="text"
                                          autoFocus
                                          value={quickAddTitle}
                                          onChange={(e) => setQuickAddTitle(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleQuickAddLesson(module.id, chapter.id);
                                            if (e.key === 'Escape') setQuickAddTarget(null);
                                          }}
                                          placeholder="Class title... e.g. Excel VLOOKUP (Press Enter to save)"
                                          className="flex-1 min-w-[200px] bg-white dark:bg-slate-900 px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
                                        />
                                        <select
                                          value={quickAddType}
                                          onChange={(e) => setQuickAddType(e.target.value as any)}
                                          className="bg-white dark:bg-slate-900 px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
                                        >
                                          <option value="auto">Auto detect</option>
                                          <option value="video">Video</option>
                                          <option value="notes">Theory</option>
                                          <option value="assignment">Assignment</option>
                                          <option value="project">Project</option>
                                          <option value="mcq">Quiz</option>
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => handleQuickAddLesson(module.id, chapter.id)}
                                          disabled={isQuickAdding || !quickAddTitle.trim()}
                                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                        >
                                          {isQuickAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                          <span>Add Class</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setQuickAddTarget(null)}
                                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setQuickAddTarget({ type: 'chapter', id: chapter.id, moduleId: module.id });
                                            setQuickAddTitle('');
                                          }}
                                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium inline-flex items-center gap-1 py-1 px-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer"
                                        >
                                          <Plus size={12} />
                                          <span>Quick add class</span>
                                        </button>
                                        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                                        <button
                                          type="button"
                                          onClick={() => setLibraryModal({ show: true, targetModuleId: module.id, targetChapterId: chapter.id })}
                                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium inline-flex items-center gap-1 py-1 px-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                                          title="Import reusable class from Library"
                                        >
                                          <Library size={12} />
                                          <span>From Library</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Quick Add Chapter */}
                          <div className="pt-2 pl-2">
                            {quickAddTarget?.type === 'module_chapter' && quickAddTarget?.id === module.id ? (
                              <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-indigo-200 dark:border-indigo-900/50 animate-in fade-in">
                                <input
                                  type="text"
                                  autoFocus
                                  value={quickAddTitle}
                                  onChange={(e) => setQuickAddTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleQuickAddChapter(module.id);
                                    if (e.key === 'Escape') setQuickAddTarget(null);
                                  }}
                                  placeholder="Chapter title... e.g. Advanced Functions (Press Enter to save)"
                                  className="flex-1 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddChapter(module.id)}
                                  disabled={isQuickAdding || !quickAddTitle.trim()}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                >
                                  {isQuickAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                  <span>Add Chapter</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuickAddTarget(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickAddTarget({ type: 'module_chapter', id: module.id, moduleId: module.id });
                                  setQuickAddTitle('');
                                }}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg border border-dashed border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
                              >
                                <Plus size={12} />
                                <span>Quick add chapter</span>
                              </button>
                            )}
                          </div>
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
                                  <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                    <div
                                      onClick={(e) => { e.stopPropagation(); toggleSelectLesson(lesson.id); }}
                                      className="p-1 cursor-pointer shrink-0 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                                      title={selectedLessonIds.has(lesson.id) ? "Deselect class" : "Select class for bulk actions"}
                                    >
                                      {selectedLessonIds.has(lesson.id) ? (
                                        <CheckSquare size={14} className="text-blue-600 dark:text-blue-400" />
                                      ) : (
                                        <Square size={14} className="text-slate-300 dark:text-slate-600 hover:text-slate-500" />
                                      )}
                                    </div>
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
                                      {isLessonContentReady(lesson) ? (
                                        <span className="shrink-0 text-emerald-500" title="Content Ready">
                                          <CheckCircle2 size={13} />
                                        </span>
                                      ) : (
                                        <span className="shrink-0 text-amber-500" title="Content Pending (No video link or notes)">
                                          <AlertCircle size={13} />
                                        </span>
                                      )}
                                      <h4 className="text-sm font-normal text-slate-700 dark:text-slate-300 truncate">{lesson.title}</h4>
                                      {lesson.difficulty && lesson.difficulty !== 'beginner' && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                          lesson.difficulty === 'advanced'
                                            ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40'
                                            : 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                                        }`}>
                                          {lesson.difficulty}
                                        </span>
                                      )}
                                      {lesson.tags && lesson.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {lesson.tags.slice(0, 3).map((tag: string, tidx: number) => (
                                            <span key={tidx} className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded flex items-center gap-0.5">
                                              <Tag size={8} className="opacity-60" />
                                              {tag}
                                            </span>
                                          ))}
                                          {lesson.tags.length > 3 && (
                                            <span className="text-[10px] text-slate-400">+{lesson.tags.length - 3}</span>
                                          )}
                                        </div>
                                      )}
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
                                      <button onClick={(e) => { e.stopPropagation(); handleSaveLessonToLibrary(lesson); }} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-555 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer" title="Save to Shared Library"><BookmarkPlus size={12} /></button>
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

      {/* Floating Multi-Select Bulk Actions Bar */}
      {selectedLessonIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[92vw] sm:w-auto bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-700/60 shrink-0">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {selectedLessonIds.size}
            </span>
            <span className="text-xs font-medium text-slate-200 hidden sm:inline">classes selected</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleBulkUpdate('is_locked', true)}
              disabled={isBulkOperating}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Lock all selected classes"
            >
              <Lock size={12} className="text-rose-400" />
              <span>Lock</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkUpdate('is_locked', false)}
              disabled={isBulkOperating}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Unlock all selected classes"
            >
              <Unlock size={12} className="text-blue-400" />
              <span>Unlock</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkUpdate('is_free', true)}
              disabled={isBulkOperating}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Make all selected classes Free Preview"
            >
              <Eye size={12} className="text-emerald-400" />
              <span>Free</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkUpdate('is_free', false)}
              disabled={isBulkOperating}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Make all selected classes Paid only"
            >
              <EyeOff size={12} className="text-slate-400" />
              <span>Paid</span>
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isBulkOperating}
              className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Permanently delete all selected classes"
            >
              {isBulkOperating ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              <span>Delete</span>
            </button>
          </div>

          <button
            type="button"
            onClick={deselectAllLessons}
            disabled={isBulkOperating}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer ml-auto shrink-0"
            title="Deselect all"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
