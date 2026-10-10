"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Plus, 
  Clock, 
  BookOpen, 
  FileText, 
  X, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  LayoutGrid, 
  List, 
  Users, 
  CheckCircle2,
  CalendarDays,
  Search,
  ArrowRight,
  Sparkles,
  Info,
  ChevronDown,
  PenTool,
  FolderPlus,
  HelpCircle,
  Flag,
  GripVertical,
  Copy,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { createSchedule, deleteSchedule, getCurriculumTopics, updateScheduleDate, duplicateSchedule } from "@/app/actions/lms/schedule";

const TYPE_CFG: Record<string, { bg: string, text: string, border: string, icon: any, label: string, accent: string }> = {
  class: { 
    bg: "bg-blue-50/60 dark:bg-blue-950/20", 
    text: "text-blue-700 dark:text-blue-400", 
    border: "border-blue-100/50 dark:border-blue-900/30", 
    accent: "bg-blue-600 dark:bg-blue-500",
    icon: <BookOpen size={14} className="shrink-0" />, 
    label: "Class" 
  },
  test: { 
    bg: "bg-rose-50/60 dark:bg-rose-950/20", 
    text: "text-rose-700 dark:text-rose-400", 
    border: "border-rose-100/50 dark:border-rose-900/30", 
    accent: "bg-rose-600 dark:bg-rose-500",
    icon: <FileText size={14} className="shrink-0" />, 
    label: "Test" 
  },
  assignment: { 
    bg: "bg-amber-50/60 dark:bg-amber-950/20", 
    text: "text-amber-700 dark:text-amber-400", 
    border: "border-amber-100/50 dark:border-amber-900/30", 
    accent: "bg-amber-600 dark:bg-amber-500",
    icon: <PenTool size={14} className="shrink-0" />, 
    label: "Assignment" 
  },
  project: { 
    bg: "bg-purple-50/60 dark:bg-purple-950/20", 
    text: "text-purple-700 dark:text-purple-400", 
    border: "border-purple-100/50 dark:border-purple-900/30", 
    accent: "bg-purple-600 dark:bg-purple-500",
    icon: <FolderPlus size={14} className="shrink-0" />, 
    label: "Project" 
  },
  quiz: { 
    bg: "bg-emerald-50/60 dark:bg-emerald-950/20", 
    text: "text-emerald-700 dark:text-emerald-400", 
    border: "border-emerald-100/50 dark:border-emerald-900/30", 
    accent: "bg-emerald-600 dark:bg-emerald-500",
    icon: <HelpCircle size={14} className="shrink-0" />, 
    label: "Quiz" 
  },
  holiday: { 
    bg: "bg-rose-50/60 dark:bg-rose-950/20", 
    text: "text-rose-700 dark:text-rose-400", 
    border: "border-rose-100/50 dark:border-rose-900/30", 
    accent: "bg-rose-600 dark:bg-rose-500",
    icon: <Flag size={14} className="shrink-0" />, 
    label: "Holiday" 
  },
  event: { 
    bg: "bg-purple-50/60 dark:bg-purple-950/20", 
    text: "text-purple-700 dark:text-purple-400", 
    border: "border-purple-100/50 dark:border-purple-900/30", 
    accent: "bg-purple-600 dark:bg-purple-500",
    icon: <Sparkles size={14} className="shrink-0" />, 
    label: "Event" 
  },
};

function cfg(t: string) { return TYPE_CFG[t] || TYPE_CFG.class; }

function fmt(d: Date) { return d.toISOString().split('T')[0]; }

export default function ScheduleClient({ 
  initialSchedules, 
  courses, 
  batches, 
  batchesList = [] 
}: { 
  initialSchedules: any[], 
  courses: any[], 
  batches: string[], 
  batchesList?: any[] 
}) {
  const router = useRouter();
  const today = new Date();

  const [schedules, setSchedules] = useState(initialSchedules);
  useEffect(() => {
    setSchedules(initialSchedules);
  }, [initialSchedules]);

  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const [inspectingDate, setInspectingDate] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [selectedBatch, setSelectedBatch] = useState("All Batches");
  const [loading, setLoading] = useState(false);
  const [curriculum, setCurriculum] = useState<{ modules: any[], tests: any[], materials: any[] }>({ modules: [], tests: [], materials: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [mobileTab, setMobileTab] = useState<'calendar' | 'curriculum'>('calendar');
  
  // Placement Mode and Collapsible modules state
  const [placementItem, setPlacementItem] = useState<{ title: string, type: 'class' | 'test' | 'assignment' | 'project' | 'quiz', originalTitle: string } | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const toggleChapterExpand = (chapId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapId]: prev[chapId] === false ? true : false
    }));
  };

  const getLessonScheduleType = (lessonType: string): 'class' | 'assignment' | 'project' | 'quiz' => {
    const t = (lessonType || 'video').toLowerCase();
    if (t === 'video' || t === 'notes') return 'class';
    if (t === 'assignment') return 'assignment';
    if (t === 'project') return 'project';
    if (t === 'mcq' || t === 'quiz') return 'quiz';
    return 'class';
  };

  const getLessonIcon = (type: string) => {
    const t = getLessonScheduleType(type);
    if (t === 'class') return <BookOpen size={10} className="text-blue-500 shrink-0" />;
    if (t === 'assignment') return <PenTool size={10} className="text-amber-500 shrink-0" />;
    if (t === 'project') return <FolderPlus size={10} className="text-purple-500 shrink-0" />;
    if (t === 'quiz') return <HelpCircle size={10} className="text-emerald-500 shrink-0" />;
    return <BookOpen size={10} className="text-blue-500 shrink-0" />;
  };

  const getFullTitle = (modTitle: string, chapTitle: string | null, lessonTitle: string) => {
    if (chapTitle) {
      return `${modTitle} > ${chapTitle}: ${lessonTitle}`;
    }
    return `${modTitle}: ${lessonTitle}`;
  };

  // Modal state for manual schedule
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    course_id: "",
    type: "holiday" as any,
    title: "",
    description: "",
    date: fmt(today),
    start_time: "09:00",
    end_time: "10:30",
    batch: "All Batches"
  });

  const toggleModuleExpand = (modId: string) => {
    setExpandedModules(prev => {
      const isDefaultExpanded = modId !== 'tests-group' && modId !== 'materials-group';
      const isCurrentExpanded = prev[modId] !== undefined ? prev[modId] : isDefaultExpanded;
      return {
        ...prev,
        [modId]: !isCurrentExpanded
      };
    });
  };

  // Compute calendar days for the month
  const days = useMemo(() => {
    const date = new Date(currentYear, currentMonth, 1);
    const result = [];
    const firstDay = date.getDay();

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      result.push({ day: prevMonthLastDay - i, currentMonth: false, dateStr: '' });
    }

    // Current month
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      result.push({ day: i, currentMonth: true, dateStr });
    }

    // Next month padding
    const remaining = 42 - result.length;
    for (let i = 1; i <= remaining; i++) {
      result.push({ day: i, currentMonth: false, dateStr: '' });
    }

    return result;
  }, [currentMonth, currentYear]);

  // Batches filtered to the selected course
  const courseBatches = useMemo(() => {
    return batchesList.filter((b: any) => b.course_id === selectedCourseId);
  }, [batchesList, selectedCourseId]);

  const selectedBatchObj = useMemo(() => {
    return batchesList.find((b: any) => b.title === selectedBatch);
  }, [batchesList, selectedBatch]);
  const selectedBatchId = selectedBatchObj?.id;

  // Fetch curriculum when course changes; auto-select batch if only one exists
  useEffect(() => {
    const batches = batchesList.filter((b: any) => b.course_id === selectedCourseId);
    if (batches.length === 1) {
      setSelectedBatch(batches[0].title);
    } else {
      setSelectedBatch("All Batches");
    }
    if (selectedCourseId) {
      getCurriculumTopics(selectedCourseId).then(setCurriculum);
    }
  }, [selectedCourseId]);

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    let s = schedules;
    if (selectedCourseId) {
      s = s.filter(x => x.course_id === selectedCourseId || !x.course_id);
    }
    if (selectedBatch !== "All Batches") {
      s = s.filter(x => x.batch === selectedBatch || x.type === 'holiday' || x.type === 'event' || !x.course_id);
    }
    return s;
  }, [schedules, selectedCourseId, selectedBatch]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else { setCurrentMonth(m => m - 1); }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else { setCurrentMonth(m => m + 1); }
  };

  // Helper to extract batch timings
  const getBatchTimings = (batchTitle: string) => {
    const batchInfo = batchesList.find(b => b.title === batchTitle);
    let startTime = "09:00";
    let endTime = "10:30";
    const timeStr = batchInfo?.timing || "";

    if (timeStr) {
      try {
        const [start, end] = timeStr.split(' - ');
        const to24 = (t: string) => {
          const [time, mod] = t.trim().split(' ');
          let [h, m] = time.split(':');
          if (h === '12') h = '00';
          if (mod === 'PM' && h !== '12') h = String(parseInt(h) + 12);
          if (mod === 'AM' && h === '12') h = '00';
          return `${h.padStart(2, '0')}:${m}`;
        };
        startTime = to24(start);
        endTime = to24(end);
      } catch (e) {}
    }
    return { startTime, endTime };
  };

  // Handle Quick Place Click on Calendar Cell
  const handlePlaceItem = async (dateStr: string) => {
    if (!placementItem) return;
    setLoading(true);
    const { startTime, endTime } = getBatchTimings(selectedBatch);
    const tempId = `temp-${Date.now()}`;
    const optimisticItem = {
      id: tempId,
      course_id: selectedCourseId,
      batch: selectedBatch,
      type: placementItem.type,
      title: placementItem.title,
      description: `${placementItem.type === 'class' ? 'Lesson' : placementItem.type === 'test' ? 'Examination' : 'Study Material'}: ${placementItem.originalTitle}`,
      date: dateStr,
      start_time: startTime,
      end_time: endTime
    };
    setSchedules(prev => [...prev, optimisticItem]);

    const res = await createSchedule({
      course_id: selectedCourseId,
      batch: selectedBatch,
      type: placementItem.type,
      title: placementItem.title,
      description: `${placementItem.type === 'class' ? 'Lesson' : placementItem.type === 'test' ? 'Examination' : 'Study Material'}: ${placementItem.originalTitle}`,
      date: dateStr,
      start_time: startTime,
      end_time: endTime
    });

    if (res.success) {
      setPlacementItem(null);
      router.refresh();
    } else {
      setSchedules(prev => prev.filter(s => s.id !== tempId));
      alert(res.error || "Failed to schedule item");
    }
    setLoading(false);
  };

  const startPlacement = (title: string, type: 'class' | 'test' | 'assignment' | 'project' | 'quiz', originalTitle: string) => {
    setPlacementItem({ title, type, originalTitle });
    setMobileTab('calendar');
  };

  // Map of scheduled items to their database IDs for easy toggle deletion
  const scheduledItemsMap = useMemo(() => {
    const map = new Map<string, string>();
    schedules
      .filter(s => s.course_id === selectedCourseId && (selectedBatch === "All Batches" || s.batch === selectedBatch))
      .forEach(s => map.set(`${s.type}:${s.title}`, s.id));
    return map;
  }, [schedules, selectedCourseId, selectedBatch]);

  // Drag-and-Drop Handlers
  const handleSidebarDragStart = (e: React.DragEvent, item: {
    title: string;
    type: 'class' | 'test' | 'assignment' | 'project' | 'quiz';
    originalTitle: string;
  }) => {
    const payload = {
      source: 'sidebar',
      ...item
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copyMove';
    setIsDraggingActive(true);
  };

  const handleCalendarItemDragStart = (e: React.DragEvent, ev: any) => {
    e.stopPropagation();
    const payload = {
      source: 'calendar',
      id: ev.id,
      title: ev.title,
      type: ev.type,
      date: ev.date,
      isEvent: ev.type === 'holiday' || ev.type === 'event'
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    setIsDraggingActive(true);
  };

  const handleDragEnd = () => {
    setIsDraggingActive(false);
    setDragOverDate(null);
  };

  const handleCellDragOver = (e: React.DragEvent, dateStr: string) => {
    if (!dateStr) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleCellDragLeave = (e: React.DragEvent, dateStr: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverDate === dateStr) {
      setDragOverDate(null);
    }
  };

  const handleCellDrop = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);
    setIsDraggingActive(false);

    if (!targetDateStr) return;

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);

      if (data.source === 'sidebar') {
        const { startTime, endTime } = getBatchTimings(selectedBatch);
        const tempId = `temp-${Date.now()}`;
        const optimisticItem = {
          id: tempId,
          course_id: selectedCourseId,
          batch: selectedBatch,
          type: data.type,
          title: data.title,
          description: `${data.type === 'class' ? 'Lesson' : data.type === 'test' ? 'Examination' : 'Study Material'}: ${data.originalTitle}`,
          date: targetDateStr,
          start_time: startTime,
          end_time: endTime
        };
        setSchedules(prev => [...prev, optimisticItem]);

        const res = await createSchedule({
          course_id: selectedCourseId,
          batch: selectedBatch,
          type: data.type,
          title: data.title,
          description: `${data.type === 'class' ? 'Lesson' : data.type === 'test' ? 'Examination' : 'Study Material'}: ${data.originalTitle}`,
          date: targetDateStr,
          start_time: startTime,
          end_time: endTime
        });

        if (!res.success) {
          setSchedules(prev => prev.filter(s => s.id !== tempId));
          alert(res.error || "Failed to schedule topic");
        } else {
          router.refresh();
        }
      } else if (data.source === 'calendar') {
        if (data.date === targetDateStr) return;

        const previousSchedules = schedules;
        setSchedules(prev => prev.map(s => s.id === data.id ? { ...s, date: targetDateStr } : s));

        const res = await updateScheduleDate({
          id: data.id,
          date: targetDateStr,
          isEvent: data.isEvent
        });

        if (!res.success) {
          setSchedules(previousSchedules);
          alert(res.error || "Failed to reschedule item");
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      console.error("Drop parsing error:", err);
    }
  };

  // Day Inspection calculations & handlers
  const inspectingDateObj = useMemo(() => {
    if (!inspectingDate) return null;
    const parts = inspectingDate.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }, [inspectingDate]);

  const formattedInspectingDate = useMemo(() => {
    if (!inspectingDateObj) return "";
    return inspectingDateObj.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }, [inspectingDateObj]);

  const goToPrevDay = () => {
    if (!inspectingDateObj) return;
    const d = new Date(inspectingDateObj);
    d.setDate(d.getDate() - 1);
    setInspectingDate(fmt(d));
  };

  const goToNextDay = () => {
    if (!inspectingDateObj) return;
    const d = new Date(inspectingDateObj);
    d.setDate(d.getDate() + 1);
    setInspectingDate(fmt(d));
  };

  // Keyboard navigation for Inspecting Modal (Left / Right arrow & Esc)
  useEffect(() => {
    if (!inspectingDate) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInspectingDate(null);
      } else if (e.key === "ArrowLeft") {
        goToPrevDay();
      } else if (e.key === "ArrowRight") {
        goToNextDay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspectingDate, inspectingDateObj]);

  // Inspecting date events
  const inspectingEvents = useMemo(() => {
    if (!inspectingDate) return [];
    return filteredSchedules
      .filter(s => s.date === inspectingDate)
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  }, [filteredSchedules, inspectingDate]);

  // Conflict detection for inspected date
  const timingConflictFound = useMemo(() => {
    if (inspectingEvents.length < 2) return false;
    for (let i = 0; i < inspectingEvents.length; i++) {
      for (let j = i + 1; j < inspectingEvents.length; j++) {
        const a = inspectingEvents[i];
        const b = inspectingEvents[j];
        if (a.batch === b.batch || a.batch === "All Batches" || b.batch === "All Batches") {
          if (a.start_time && b.start_time && a.start_time === b.start_time) {
            return true;
          }
        }
      }
    }
    return false;
  }, [inspectingEvents]);

  // 1-Click Postpone (+1 Day Shift)
  const handlePostponeItem = async (ev: any) => {
    if (!inspectingDateObj) return;
    const nextD = new Date(inspectingDateObj);
    nextD.setDate(nextD.getDate() + 1);
    const nextDateStr = fmt(nextD);

    const prev = schedules;
    setSchedules(s => s.map(x => x.id === ev.id ? { ...x, date: nextDateStr } : x));

    const res = await updateScheduleDate({
      id: ev.id,
      date: nextDateStr,
      isEvent: ev.type === 'holiday' || ev.type === 'event'
    });

    if (!res.success) {
      setSchedules(prev);
      alert(res.error || "Failed to postpone");
    } else {
      router.refresh();
    }
  };

  // 1-Click Duplicate (+1 Day Copy)
  const handleDuplicateItem = async (ev: any) => {
    if (!inspectingDateObj) return;
    const nextD = new Date(inspectingDateObj);
    nextD.setDate(nextD.getDate() + 1);
    const nextDateStr = fmt(nextD);

    const tempId = `temp-${Date.now()}`;
    setSchedules(s => [...s, { ...ev, id: tempId, date: nextDateStr }]);

    const res = await duplicateSchedule(ev.id, nextDateStr);
    if (!res.success) {
      setSchedules(s => s.filter(x => x.id !== tempId));
      alert(res.error || "Failed to duplicate");
    } else {
      router.refresh();
    }
  };

  // Hierarchical Curriculum structures filtered by search and batch
  const filteredModules = useMemo(() => {
    return curriculum.modules.map(mod => {
      // Filter module by batch (only if a specific batch is selected, show global or assigned modules)
      if (selectedBatch !== "All Batches" && selectedBatchId) {
        const isAssigned = mod.batches?.includes(selectedBatchId);
        const isGlobal = !mod.batches || mod.batches.length === 0;
        if (!isAssigned && !isGlobal) return null;
      }

      const filteredLessons = (mod.lessons || []).filter((l: any) => {
        if (selectedBatch !== "All Batches" && selectedBatchId) {
          const isAssigned = l.batches?.includes(selectedBatchId);
          const isGlobal = !l.batches || l.batches.length === 0;
          if (!isAssigned && !isGlobal) return false;
        }
        return !searchQuery || l.title.toLowerCase().includes(searchQuery.toLowerCase());
      });
      
      const filteredChapters = (mod.lms_chapters || []).map((chap: any) => {
        if (selectedBatch !== "All Batches" && selectedBatchId) {
          const isAssigned = chap.batches?.includes(selectedBatchId);
          const isGlobal = !chap.batches || chap.batches.length === 0;
          if (!isAssigned && !isGlobal) return null;
        }

        const filteredChapLessons = (chap.lessons || []).filter((l: any) => {
          if (selectedBatch !== "All Batches" && selectedBatchId) {
            const isAssigned = l.batches?.includes(selectedBatchId);
            const isGlobal = !l.batches || l.batches.length === 0;
            if (!isAssigned && !isGlobal) return false;
          }
          return !searchQuery || l.title.toLowerCase().includes(searchQuery.toLowerCase());
        });
        return {
          ...chap,
          lessons: filteredChapLessons
        };
      }).filter(Boolean).filter((chap: any) => chap.lessons.length > 0 || !searchQuery || chap.title.toLowerCase().includes(searchQuery.toLowerCase()));

      return {
        ...mod,
        lessons: filteredLessons,
        lms_chapters: filteredChapters
      };
    }).filter(Boolean).filter(mod => mod.lessons.length > 0 || mod.lms_chapters.length > 0 || !searchQuery || mod.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [curriculum.modules, searchQuery, selectedBatch, selectedBatchId]);

  const filteredTests = useMemo(() => {
    return curriculum.tests.filter(t => {
      if (selectedBatch !== "All Batches" && selectedBatchId) {
        const isAssigned = t.batches?.includes(selectedBatchId);
        const isGlobal = !t.batches || t.batches.length === 0;
        if (!isAssigned && !isGlobal) return false;
      }
      return !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [curriculum.tests, searchQuery, selectedBatch, selectedBatchId]);

  const filteredMaterials = useMemo(() => {
    return curriculum.materials.filter(m => {
      if (selectedBatch !== "All Batches" && selectedBatchId) {
        const isAssigned = m.batches?.includes(selectedBatchId);
        const isGlobal = !m.batches || m.batches.length === 0;
        if (!isAssigned && !isGlobal) return false;
      }
      return !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [curriculum.materials, searchQuery, selectedBatch, selectedBatchId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this event from schedule?")) return;
    setSchedules(prev => prev.filter(s => s.id !== id));
    const res = await deleteSchedule(id);
    if (!res.success) {
      alert(res.error || "Failed to delete");
      router.refresh();
    } else {
      router.refresh();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createSchedule(formData);
    if (res.success) {
      setShowAddModal(false);
      router.refresh();
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const handleClearAll = async () => {
    const count = filteredSchedules.length;
    if (count === 0) return;
    if (!confirm(`Are you sure you want to remove ALL ${count} scheduled items for the current selection?`)) return;
    
    setLoading(true);
    const toRemoveIds = new Set(filteredSchedules.map(s => s.id));
    setSchedules(prev => prev.filter(s => !toRemoveIds.has(s.id)));
    for (const s of filteredSchedules) {
      await deleteSchedule(s.id);
    }
    router.refresh();
    setLoading(false);
    alert(`Successfully removed ${count} items.`);
  };

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      <div className="max-w-[1600px] mx-auto space-y-3">
        
        {/* Top bar with selectors */}
        <div className="bg-white dark:bg-slate-900 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
               <BookOpen size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
               <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Course</span>
               <select 
                value={selectedCourseId} 
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none cursor-pointer border-none p-0 focus:ring-0"
               >
                 {courses.map(c => <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{c.title}</option>)}
               </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
               <Users size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
               <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Batch</span>
               <select 
                value={selectedBatch} 
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none cursor-pointer border-none p-0 focus:ring-0"
               >
                 {courseBatches.length > 1 && (
                   <option value="All Batches" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Batches</option>
                 )}
                 {courseBatches.map((b: any, i: number) => (
                   <option key={i} value={b.title} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{b.title}</option>
                 ))}
               </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
             <div className="flex bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><LayoutGrid size={14} /></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><List size={14} /></button>
             </div>

             <div className="hidden sm:flex items-center gap-3 border-l border-slate-200 dark:border-slate-700 pl-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">Scheduled: <strong className="text-slate-900 dark:text-white font-semibold">{filteredSchedules.length}</strong></span>
                <button 
                  onClick={handleClearAll}
                  disabled={filteredSchedules.length === 0}
                  className="text-xs font-medium text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  Clear
                </button>
             </div>

             <Link
               href="/admin/calendar"
               className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
             >
               <Calendar size={13} className="shrink-0 text-blue-600 dark:text-blue-400" />
               <span>Full Calendar</span>
             </Link>

             <button onClick={() => {
                  setFormData({...formData, title: "", description: "", type: "holiday", course_id: selectedCourseId});
                  setShowAddModal(true);
                }}
               className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
             >
                <Plus size={13} className="shrink-0" /> New Entry
             </button>
          </div>
        </div>

        {/* Placement Mode Alert Banner */}
        {placementItem && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping shrink-0" />
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Placement mode: Click a date to schedule <span className="font-medium text-slate-900 dark:text-white">{placementItem.originalTitle}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPlacementItem(null)}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Mobile Tab Toggle */}
        <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setMobileTab('calendar')}
            className={`flex-1 py-1.5 text-center rounded-md text-xs font-medium transition-all cursor-pointer ${
              mobileTab === 'calendar'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setMobileTab('curriculum')}
            className={`flex-1 py-1.5 text-center rounded-md text-xs font-medium transition-all cursor-pointer ${
              mobileTab === 'curriculum'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Curriculum
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Left Column: Entire Collapsible Curriculum Structure */}
          <div className={`lg:col-span-4 xl:col-span-4 space-y-4 lg:sticky lg:top-4 ${mobileTab === 'curriculum' ? 'block' : 'hidden lg:block'}`}>
             <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-240px)] lg:h-[calc(100vh-180px)]">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 space-y-2">
                   <div className="flex items-center justify-between">
                      <h2 className="text-xs font-medium text-slate-800 dark:text-slate-200 uppercase tracking-wider">Course Curriculum</h2>
                      <Sparkles size={14} className="text-amber-500" />
                   </div>
                   
                   {/* Search */}
                   <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-xs font-normal outline-none focus:border-blue-400 transition-all text-slate-800 dark:text-slate-100"
                      />
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar bg-slate-50/20 dark:bg-slate-950/15">
                   
                   {/* Modules & Lessons */}
                   <div className="space-y-2">
                      <h3 className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1">Modules</h3>
                      
                      {filteredModules.map((mod) => {
                        const isExpanded = expandedModules[mod.id] !== false;
                        return (
                          <div key={mod.id} className="border border-slate-200/60 dark:border-slate-800/80 rounded-lg overflow-hidden bg-white dark:bg-slate-900 transition-all mb-2">
                            {/* Module Header */}
                            <div 
                              onClick={() => toggleModuleExpand(mod.id)}
                              className="flex items-center justify-between py-2 px-2.5 bg-slate-50/50 dark:bg-slate-900/40 cursor-pointer select-none border-b border-slate-100 dark:border-slate-800"
                            >
                              <h3 className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate flex-1 pr-2">
                                <BookOpen size={12} className="text-blue-500 shrink-0" />
                                {mod.title}
                              </h3>
                              <span className="text-slate-400 dark:text-slate-500 shrink-0">
                                <ChevronDown size={12} className={`transform transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                              </span>
                            </div>

                            {/* Lessons and Chapters List */}
                            {isExpanded && (
                                <div className="p-1 space-y-1.5">
                                  {/* Chapters */}
                                  {(mod.lms_chapters || []).length > 0 && (
                                    <div className="space-y-1">
                                      {(mod.lms_chapters || []).map((chap: any) => {
                                        const isChapExpanded = expandedChapters[chap.id] !== false;
                                        return (
                                          <div key={chap.id} className="rounded-md overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                            {/* Chapter Header */}
                                            <div 
                                              onClick={() => toggleChapterExpand(chap.id)}
                                              className="flex items-center justify-between py-1.5 px-2 bg-slate-50/20 dark:bg-slate-900/10 cursor-pointer select-none border-b border-slate-100 dark:border-slate-800/40"
                                            >
                                              <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate pr-2">Ch: {chap.title}</span>
                                              <ChevronDown size={10} className={`transform transition-transform text-slate-400 ${isChapExpanded ? 'rotate-180' : ''}`} />
                                            </div>

                                            {/* Chapter Lessons */}
                                            {isChapExpanded && (
                                              <div className="p-1 space-y-1 divide-y divide-slate-50 dark:divide-slate-800/40">
                                                {(chap.lessons || []).length > 0 ? (
                                                  (chap.lessons || []).map((lesson: any) => {
                                                    const scheduleType = getLessonScheduleType(lesson.lesson_type || lesson.type);
                                                    const fullTitle = getFullTitle(mod.title, chap.title, lesson.title);
                                                    const scheduleId = scheduledItemsMap.get(`${scheduleType}:${fullTitle}`);
                                                    const isScheduled = !!scheduleId;
                                                    const isPending = placementItem?.type === scheduleType && placementItem?.title === fullTitle;

                                                    return (
                                                      <div 
                                                        key={lesson.id} 
                                                        draggable={!isScheduled}
                                                        onDragStart={(e) => !isScheduled && handleSidebarDragStart(e, { title: fullTitle, type: scheduleType, originalTitle: lesson.title })}
                                                        onDragEnd={handleDragEnd}
                                                        className={`flex items-start justify-between gap-2 py-1 px-1.5 rounded-md transition-all ${
                                                          isScheduled 
                                                            ? 'bg-slate-50/60 dark:bg-slate-950/20 opacity-90' 
                                                            : isPending 
                                                              ? 'bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50' 
                                                              : 'bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80'
                                                        }`}
                                                        title={isScheduled ? "Already scheduled" : "Drag onto calendar date, or click Schedule"}
                                                      >
                                                        <div className="min-w-0 flex-1 flex items-center gap-1 select-none">
                                                          {!isScheduled && <GripVertical size={10} className="text-slate-400 dark:text-slate-500 shrink-0 opacity-40 hover:opacity-100" />}
                                                          {getLessonIcon(lesson.lesson_type || lesson.type)}
                                                          <h5 className="text-[10px] font-normal text-slate-700 dark:text-slate-200 leading-snug break-words">{lesson.title}</h5>
                                                        </div>
                                                        
                                                        <div className="shrink-0 flex items-center gap-1">
                                                          {isScheduled ? (
                                                            <>
                                                              <span className="w-4 h-4 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 flex items-center justify-center border border-green-100 dark:border-green-900/30">
                                                                <CheckCircle2 size={10} />
                                                              </span>
                                                              <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  handleDelete(scheduleId);
                                                                }}
                                                                className="p-0.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                                                title="Remove from Schedule"
                                                              >
                                                                <Trash2 size={10} />
                                                              </button>
                                                            </>
                                                          ) : (
                                                            <button 
                                                              type="button"
                                                              onClick={() => startPlacement(fullTitle, scheduleType, lesson.title)}
                                                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-colors cursor-pointer flex items-center gap-0.5 border ${
                                                                isPending
                                                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                                  : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/40 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600'
                                                              }`}
                                                              title="Click here, then click a calendar date to schedule"
                                                            >
                                                              <Plus size={8} />
                                                              {isPending ? 'Active' : 'Schedule'}
                                                            </button>
                                                          )}
                                                        </div>
                                                      </div>
                                                    );
                                                  })
                                                ) : (
                                                  <p className="text-[9px] text-slate-400 dark:text-slate-600 italic p-2 text-center">No topics in this chapter.</p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Uncategorized Module Lessons */}
                                  {(mod.lessons || []).length > 0 && (
                                    <div className="p-1 space-y-1">
                                      {(mod.lessons || []).map((lesson: any) => {
                                        const scheduleType = getLessonScheduleType(lesson.lesson_type || lesson.type);
                                        const fullTitle = getFullTitle(mod.title, null, lesson.title);
                                        const scheduleId = scheduledItemsMap.get(`${scheduleType}:${fullTitle}`);
                                        const isScheduled = !!scheduleId;
                                        const isPending = placementItem?.type === scheduleType && placementItem?.title === fullTitle;

                                        return (
                                          <div 
                                            key={lesson.id} 
                                            draggable={!isScheduled}
                                            onDragStart={(e) => !isScheduled && handleSidebarDragStart(e, { title: fullTitle, type: scheduleType, originalTitle: lesson.title })}
                                            onDragEnd={handleDragEnd}
                                            className={`flex items-start justify-between gap-2 py-1 px-1.5 rounded-md transition-all ${
                                              isScheduled 
                                                ? 'bg-slate-50/60 dark:bg-slate-950/20 opacity-90' 
                                                : isPending 
                                                  ? 'bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50' 
                                                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80'
                                            }`}
                                            title={isScheduled ? "Already scheduled" : "Drag onto calendar date, or click Schedule"}
                                          >
                                            <div className="min-w-0 flex-1 flex items-center gap-1 select-none">
                                              {!isScheduled && <GripVertical size={10} className="text-slate-400 dark:text-slate-500 shrink-0 opacity-40 hover:opacity-100" />}
                                              {getLessonIcon(lesson.lesson_type || lesson.type)}
                                              <h5 className="text-[10px] font-normal text-slate-700 dark:text-slate-200 leading-snug break-words">{lesson.title}</h5>
                                            </div>
                                            
                                            <div className="shrink-0 flex items-center gap-1">
                                              {isScheduled ? (
                                                <>
                                                  <span className="w-4 h-4 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 flex items-center justify-center border border-green-100 dark:border-green-900/30">
                                                    <CheckCircle2 size={10} />
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDelete(scheduleId);
                                                    }}
                                                    className="p-0.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                                    title="Remove from Schedule"
                                                  >
                                                    <Trash2 size={10} />
                                                  </button>
                                                </>
                                              ) : (
                                                <button 
                                                  type="button"
                                                  onClick={() => startPlacement(fullTitle, scheduleType, lesson.title)}
                                                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-colors cursor-pointer flex items-center gap-0.5 border ${
                                                    isPending
                                                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                      : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/40 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600'
                                                  }`}
                                                  title="Click here, then click a calendar date to schedule"
                                                >
                                                  <Plus size={8} />
                                                  {isPending ? 'Active' : 'Schedule'}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {(!mod.lessons || mod.lessons.length === 0) && (!mod.lms_chapters || mod.lms_chapters.length === 0) && (
                                    <p className="text-[9px] text-slate-400 dark:text-slate-600 italic p-2 text-center">No topics in this module.</p>
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      })}
                   </div>

                   {/* Tests */}
                   <div className="space-y-2 pt-1.5">
                     <h3 className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Examinations</h3>
                     <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-lg overflow-hidden bg-white dark:bg-slate-900 transition-all">
                        <div 
                          onClick={() => toggleModuleExpand('tests-group')}
                          className="flex items-center justify-between py-2 px-2.5 bg-slate-50/50 dark:bg-slate-900/40 cursor-pointer select-none border-b border-slate-100 dark:border-slate-800"
                        >
                          <h3 className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <FileText size={12} className="text-rose-500 shrink-0" />
                            Tests & Exams
                          </h3>
                          <span className="text-slate-400 dark:text-slate-500 shrink-0">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="12" 
                              height="12" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              className={`transform transition-transform duration-150 ${expandedModules['tests-group'] === true ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>

                        {expandedModules['tests-group'] === true && (
                          <div className="p-1 space-y-1 divide-y divide-slate-50 dark:divide-slate-800/40">
                            {filteredTests.length > 0 ? (
                              filteredTests.map((test) => {
                                const fullTitle = `Test: ${test.title}`;
                                const scheduleId = scheduledItemsMap.get(`test:${fullTitle}`);
                                const isScheduled = !!scheduleId;
                                const isPending = placementItem?.type === 'test' && placementItem?.title === fullTitle;

                                return (
                                  <div 
                                    key={test.id} 
                                    draggable={!isScheduled}
                                    onDragStart={(e) => !isScheduled && handleSidebarDragStart(e, { title: fullTitle, type: 'test', originalTitle: test.title })}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-start justify-between gap-2 py-1.5 px-2 rounded-md transition-all ${
                                      isScheduled 
                                        ? 'bg-slate-50/60 dark:bg-slate-950/20 opacity-90' 
                                        : isPending 
                                          ? 'bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/50' 
                                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80'
                                    }`}
                                    title={isScheduled ? "Already scheduled" : "Drag onto calendar date, or click Schedule"}
                                  >
                                    <div className="min-w-0 flex-1 flex items-center gap-1 select-none">
                                      {!isScheduled && <GripVertical size={10} className="text-slate-400 dark:text-slate-500 shrink-0 opacity-40 hover:opacity-100" />}
                                      <h5 className="text-[10px] font-normal text-slate-700 dark:text-slate-200 leading-snug break-words">{test.title}</h5>
                                    </div>
                                    
                                    <div className="shrink-0 flex items-center gap-1">
                                      {isScheduled ? (
                                        <>
                                          <span className="w-4 h-4 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 flex items-center justify-center border border-green-100 dark:border-green-900/30">
                                            <CheckCircle2 size={10} />
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(scheduleId);
                                            }}
                                            className="p-0.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                            title="Remove from Schedule"
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </>
                                      ) : (
                                        <button 
                                          type="button"
                                          onClick={() => startPlacement(fullTitle, 'test', test.title)}
                                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-colors cursor-pointer flex items-center gap-0.5 border ${
                                            isPending
                                              ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                                              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100/50 dark:border-rose-900/40 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600'
                                          }`}
                                          title="Click here, then click a calendar date to schedule"
                                        >
                                          <Plus size={8} />
                                          {isPending ? 'Active' : 'Schedule'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[9px] text-slate-400 dark:text-slate-600 italic p-2.5 text-center">No tests found for this course.</p>
                            )}
                          </div>
                        )}
                     </div>
                   </div>

                   {/* Study Notes */}
                   <div className="space-y-2 pt-1.5">
                     <h3 className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Materials</h3>
                     <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-lg overflow-hidden bg-white dark:bg-slate-900 transition-all">
                        <div 
                          onClick={() => toggleModuleExpand('materials-group')}
                          className="flex items-center justify-between py-2 px-2.5 bg-slate-50/50 dark:bg-slate-900/40 cursor-pointer select-none border-b border-slate-100 dark:border-slate-800"
                        >
                          <h3 className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <BookOpen size={12} className="text-amber-500 shrink-0" />
                            Notes & Study Guides
                          </h3>
                          <span className="text-slate-400 dark:text-slate-500 shrink-0">
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="12" 
                              height="12" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              className={`transform transition-transform duration-150 ${expandedModules['materials-group'] === true ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </div>

                        {expandedModules['materials-group'] === true && (
                          <div className="p-1 space-y-1 divide-y divide-slate-50 dark:divide-slate-800/40">
                            {filteredMaterials.length > 0 ? (
                              filteredMaterials.map((material) => {
                                const fullTitle = `Note: ${material.title}`;
                                const scheduleId = scheduledItemsMap.get(`assignment:${fullTitle}`);
                                const isScheduled = !!scheduleId;
                                const isPending = placementItem?.type === 'assignment' && placementItem?.title === fullTitle;

                                return (
                                  <div 
                                    key={material.id} 
                                    draggable={!isScheduled}
                                    onDragStart={(e) => !isScheduled && handleSidebarDragStart(e, { title: fullTitle, type: 'assignment', originalTitle: material.title })}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-start justify-between gap-2 py-1.5 px-2 rounded-md transition-all ${
                                      isScheduled 
                                        ? 'bg-slate-50/60 dark:bg-slate-950/20 opacity-90' 
                                        : isPending 
                                          ? 'bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50' 
                                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80'
                                    }`}
                                    title={isScheduled ? "Already scheduled" : "Drag onto calendar date, or click Schedule"}
                                  >
                                    <div className="min-w-0 flex-1 flex items-center gap-1 select-none">
                                      {!isScheduled && <GripVertical size={10} className="text-slate-400 dark:text-slate-500 shrink-0 opacity-40 hover:opacity-100" />}
                                      <h5 className="text-[10px] font-normal text-slate-700 dark:text-slate-200 leading-snug break-words">{material.title}</h5>
                                    </div>
                                    
                                    <div className="shrink-0 flex items-center gap-1">
                                      {isScheduled ? (
                                        <>
                                          <span className="w-4 h-4 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 flex items-center justify-center border border-green-100 dark:border-green-900/30">
                                            <CheckCircle2 size={10} />
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(scheduleId);
                                            }}
                                            className="p-0.5 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                            title="Remove from Schedule"
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </>
                                      ) : (
                                        <button 
                                          type="button"
                                          onClick={() => startPlacement(fullTitle, 'assignment', material.title)}
                                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-colors cursor-pointer flex items-center gap-0.5 border ${
                                            isPending
                                              ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/40 hover:bg-amber-600 hover:text-white dark:hover:bg-blue-600'
                                          }`}
                                          title="Click here, then click a calendar date to schedule"
                                        >
                                          <Plus size={8} />
                                          {isPending ? 'Active' : 'Schedule'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[9px] text-slate-400 dark:text-slate-650 italic p-2.5 text-center">No notes found for this course.</p>
                            )}
                          </div>
                        )}
                     </div>
                   </div>

                </div>
             </div>
          </div>

          {/* Right Column: Interactive Calendar or List View */}
          <div className={`lg:col-span-8 xl:col-span-8 space-y-4 ${mobileTab === 'calendar' ? 'block' : 'hidden lg:block'}`}>
             {viewMode === 'calendar' ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[430px] flex flex-col">
                   
                   {/* Calendar Header */}
                   <div className="py-1.5 px-3 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                         <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-md">
                            <CalendarDays size={14} />
                         </div>
                         <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight">{monthNames[currentMonth]} {currentYear}</h2>
                              {isDraggingActive && (
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-[8px] font-medium animate-pulse">
                                  Drag & Drop Active
                                </span>
                              )}
                            </div>
                            <p className="text-[8px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              Drag topics onto dates or drag items to reschedule
                            </p>
                         </div>
                      </div>
    
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-100 dark:border-slate-800">
                         <button onClick={handlePrevMonth} className="p-1 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded transition-all text-slate-650 dark:text-slate-400 cursor-pointer"><ChevronLeft size={12} /></button>
                         <button onClick={() => {setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear());}} className="px-2 py-0.5 text-[8px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-sm rounded border border-blue-50 dark:border-blue-900/30 cursor-pointer">Today</button>
                         <button onClick={handleNextMonth} className="p-1 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded transition-all text-slate-655 dark:text-slate-400 cursor-pointer"><ChevronRight size={12} /></button>
                      </div>
                   </div>
    
                   {/* Grid Header Days */}
                   <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                      {dayNames.map((d, i) => (
                         <div key={i} className="p-1 text-center border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                            <p className={`text-[7px] font-medium uppercase tracking-[0.2em] ${
                               i === 0 ? 'text-rose-500 dark:text-rose-400 font-black' : 'text-slate-400 dark:text-slate-500'
                            }`}>{d}</p>
                         </div>
                      ))}
                   </div>
    
                   <div className="grid grid-cols-7 flex-1">
                      {days.map((d, i) => {
                         const dateStr = d.dateStr;
                         const isToday = dateStr === fmt(today);
                         const isSunday = i % 7 === 0;
                         const dayEvents = dateStr ? filteredSchedules.filter(s => s.date === dateStr).sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || '')) : [];
                         const isCellDragOver = dragOverDate === dateStr;
                         
                         return (
                            <div 
                              key={i} 
                              onMouseEnter={() => !isDraggingActive && dateStr && setHoveredDate(dateStr)}
                              onMouseLeave={() => setHoveredDate(null)}
                              onDragOver={(e) => d.currentMonth && dateStr && handleCellDragOver(e, dateStr)}
                              onDragLeave={(e) => d.currentMonth && dateStr && handleCellDragLeave(e, dateStr)}
                              onDrop={(e) => d.currentMonth && dateStr && handleCellDrop(e, dateStr)}
                              onClick={() => {
                                if (!d.currentMonth || !dateStr) return;
                                if (placementItem) {
                                  handlePlaceItem(dateStr);
                                } else {
                                  setInspectingDate(dateStr);
                                }
                              }}
                              className={`border-r border-slate-100 dark:border-slate-800 last:border-r-0 p-1 min-h-[78px] flex flex-col gap-0.5 transition-all cursor-pointer relative ${
                                !d.currentMonth 
                                  ? 'bg-slate-50/20 dark:bg-slate-900/5 opacity-40' 
                                  : isCellDragOver
                                    ? 'ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-950/60 border-blue-400 z-10 shadow-md scale-[1.01]'
                                    : isDraggingActive
                                      ? 'bg-blue-50/15 dark:bg-blue-950/10 border-dashed border-blue-200 dark:border-blue-900/50 hover:bg-blue-100/30'
                                      : isToday 
                                        ? 'bg-blue-50/20 dark:bg-blue-955/10 border-2 border-blue-500/30' 
                                        : placementItem 
                                          ? 'bg-blue-50/10 dark:bg-blue-955/5 hover:bg-blue-100/30 dark:hover:bg-blue-900/20 border border-dashed border-blue-300 dark:border-blue-800/80 animate-pulse' 
                                          : isSunday
                                            ? 'bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-100/30 dark:hover:bg-rose-900/20'
                                            : 'hover:bg-slate-50/30 dark:hover:bg-slate-900/10'
                              }`}
                            >
                               <div className="flex justify-between items-center mb-0.5">
                                  <span className={`text-[8px] font-medium ${
                                    isToday 
                                      ? 'bg-blue-600 text-white w-4 h-4 flex items-center justify-center rounded-full font-mono' 
                                      : isSunday && d.currentMonth
                                        ? 'text-rose-500 dark:text-rose-400 font-bold'
                                        : 'text-slate-400 dark:text-slate-500'
                                  }`}>
                                     {d.day}
                                  </span>
                                  {isCellDragOver ? (
                                    <span className="text-[7px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider animate-pulse">Drop</span>
                                  ) : hoveredDate === dateStr && dayEvents.length > 0 && !isDraggingActive ? (
                                    <span className="text-[7px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-1 py-0.2 rounded border border-slate-200/60 dark:border-slate-700 shadow-sm pointer-events-none animate-in fade-in duration-100">
                                      {dayEvents.length} {dayEvents.length === 1 ? 'item' : 'items'}
                                    </span>
                                  ) : null}
                               </div>
                               
                               <div className="space-y-0.5 overflow-y-auto custom-scrollbar max-h-[50px]">
                                 {dayEvents.map((ev: any) => {
                                   const c = cfg(ev.type);
                                   return (
                                     <div 
                                       key={ev.id} 
                                       draggable={true}
                                       onDragStart={(e) => handleCalendarItemDragStart(e, ev)}
                                       onDragEnd={handleDragEnd}
                                       title="Drag to reschedule to another date"
                                       className={`group relative px-1 py-0.5 rounded ${c.bg} border ${c.border} border-l-2 ${c.accent.replace('bg-', 'border-')} shadow-sm transition-all overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md select-none`}
                                     >
                                        <div className="flex items-center justify-between gap-0.5">
                                          <h5 className="text-[7px] font-normal text-slate-800 dark:text-slate-200 truncate leading-tight flex-1 pointer-events-none">{ev.title}</h5>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(ev.id); }}
                                            className="p-0.5 hover:text-rose-500 text-slate-400 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity cursor-pointer shrink-0"
                                            title="Delete"
                                          >
                                            <Trash2 size={8} />
                                          </button>
                                        </div>
                                     </div>
                                   );
                                 })}
                               </div>
                            </div>
                         )
                      })}
                   </div>
                </div>
             ) : (
                /* List View */
                <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[550px]">
                   <div className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                      <h2 className="text-xs font-medium text-slate-800 dark:text-slate-200 uppercase tracking-wider">Schedule History & Management</h2>
                   </div>
                   <div className="flex-1 overflow-y-auto">
                     {filteredSchedules.length === 0 ? (
                       <div className="py-28 text-center space-y-3">
                         <Calendar size={36} className="mx-auto text-slate-200 dark:text-slate-800" />
                         <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">No scheduled items for this selection</p>
                       </div>
                     ) : (
                       <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                         {filteredSchedules
                           .sort((a: any, b: any) => b.date.localeCompare(a.date))
                           .map((ev: any) => {
                           const c = cfg(ev.type);
                           return (
                             <div key={ev.id} className="py-3 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-colors">
                               <div className="flex items-center gap-4">
                                 <div className="text-center w-12 select-none">
                                   <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">
                                     {new Date(ev.date).toLocaleDateString('en-US', { month: 'short' })}
                                   </p>
                                   <p className="text-lg font-medium text-slate-800 dark:text-slate-100 leading-tight mt-1 font-mono">{ev.date.split('-')[2]}</p>
                                 </div>
                                 <div className={`w-8 h-8 rounded-lg ${c.bg} ${c.text} flex items-center justify-center border ${c.border} shrink-0`}>
                                   {c.icon}
                                 </div>
                                 <div>
                                   <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                     <h4 className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-tight">{ev.title}</h4>
                                     <span className={`px-1.5 py-0.5 rounded-sm ${c.accent} text-white text-[7px] font-medium uppercase tracking-wider`}>
                                       {c.label}
                                     </span>
                                   </div>
                                   <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                                     {ev.type !== 'holiday' && ev.type !== 'event' && (
                                       <div className="flex items-center gap-1 text-[9px] font-normal">
                                         <Clock size={10} className="text-slate-400 dark:text-slate-555 shrink-0" /> {ev.start_time?.slice(0, 5)} - {ev.end_time?.slice(0, 5)}
                                       </div>
                                     )}
                                     <div className="flex items-center gap-1 text-[9px] font-normal">
                                       <Users size={10} className="text-slate-400 dark:text-slate-555 shrink-0" /> {ev.batch === "All Batches" ? "Global" : ev.batch}
                                     </div>
                                   </div>
                                 </div>
                               </div>
                               <button 
                                 onClick={() => handleDelete(ev.id)}
                                 className="p-2 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-slate-350 hover:text-rose-600 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-rose-105 hover:border-rose-100 dark:hover:border-rose-900/40 transition-all shadow-sm cursor-pointer"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                           );
                         })}
                       </div>
                     )}
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Schedule Activity</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add an event or holiday to the calendar</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-slate-600 cursor-pointer"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Event Type</label>
                <div className="flex bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 gap-0.5">
                  {(['holiday', 'event'] as const).map(type => {
                    const c = cfg(type);
                    const isSelected = formData.type === type;
                    return (
                      <button 
                        key={type} 
                        type="button" 
                        onClick={() => setFormData({...formData, type})}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${isSelected ? `bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white` : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        {c.icon} {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Activity Title</label>
                <input 
                  required
                  type="text" 
                  placeholder="Enter title..."
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-all text-sm placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
                  <input 
                    required
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:border-slate-400 transition-all text-sm cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Batch</label>
                  <select 
                    value={formData.batch}
                    onChange={(e) => {
                      const val = e.target.value;
                      const batchInfo = batchesList.find(b => b.title === val);
                      if (batchInfo?.timing) {
                        try {
                          const [start, end] = batchInfo.timing.split(' - ');
                          const to24 = (t: string) => {
                            const [time, mod] = t.trim().split(' ');
                            let [h, m] = time.split(':');
                            if (h === '12') h = '00';
                            if (mod === 'PM' && h !== '12') h = String(parseInt(h) + 12);
                            if (mod === 'AM' && h === '12') h = '00';
                            return `${h.padStart(2, '0')}:${m}`;
                          };
                          setFormData({ ...formData, batch: val, start_time: to24(start), end_time: to24(end) });
                        } catch (e) {
                          setFormData({...formData, batch: val});
                        }
                      } else {
                        setFormData({...formData, batch: val});
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-slate-400 transition-all text-sm cursor-pointer"
                  >
                    <option value="All Batches" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Batches</option>
                    {batchesList.map((b, i) => (
                      <option key={i} value={b.title} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{b.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-1 flex gap-2.5">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-medium text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  disabled={loading}
                  className="flex-[2] py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 rounded-full animate-spin" /> : <ArrowRight size={13} />}
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day Command Center Modal */}
      {inspectingDate && inspectingDateObj && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]">
            
            {/* Modal Header with Date Nav */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-0.5 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                  <button 
                    onClick={goToPrevDay}
                    title="Previous Day (Left Arrow)"
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button 
                    onClick={() => setInspectingDate(fmt(today))}
                    title="Go to Today"
                    className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button 
                    onClick={goToNextDay}
                    title="Next Day (Right Arrow)"
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight truncate">
                      {formattedInspectingDate}
                    </h3>
                    {inspectingDate === fmt(today) && (
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[9px] font-medium border border-blue-200 dark:border-blue-800">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {inspectingEvents.length === 0 
                      ? "No schedule for this day" 
                      : `${inspectingEvents.length} item${inspectingEvents.length > 1 ? "s" : ""} scheduled`}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setInspectingDate(null)}
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conflict Warning Alert */}
            {timingConflictFound && (
              <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Timing clash: Multiple activities start at the same time for this batch.</span>
              </div>
            )}

            {/* Modal Body / Items List */}
            <div className="p-5 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {inspectingEvents.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Nothing scheduled on this date</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Drag topics here from the left sidebar or schedule below.</p>
                  </div>
                  <button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        date: inspectingDate,
                        title: "",
                        description: "",
                        type: "class",
                        course_id: selectedCourseId
                      });
                      setInspectingDate(null);
                      setShowAddModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    Schedule Activity
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {inspectingEvents.map((ev) => {
                    const c = cfg(ev.type);
                    const isPastOrToday = inspectingDate <= fmt(today);

                    return (
                      <div 
                        key={ev.id} 
                        className={`p-3 rounded-xl border ${c.border} ${c.bg} border-l-4 ${c.accent.replace('bg-', 'border-')} shadow-sm transition-all space-y-2`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium uppercase tracking-wider ${c.accent} text-white flex items-center gap-1`}>
                                {c.label}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                {ev.batch === "All Batches" ? "Global (All Batches)" : ev.batch}
                              </span>
                            </div>
                            <h4 className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-snug">
                              {ev.title}
                            </h4>
                            {ev.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                {ev.description}
                              </p>
                            )}
                          </div>

                          <button 
                            onClick={() => handleDelete(ev.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Delete from schedule"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Meta Bar & Quick Actions */}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[10px]">
                            {ev.start_time && (
                              <span className="flex items-center gap-1">
                                <Clock size={11} className="text-slate-400" />
                                <span>{ev.start_time.slice(0, 5)} - {ev.end_time ? ev.end_time.slice(0, 5) : ""}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Attendance Shortcut */}
                            {(ev.type === 'class' || ev.type === 'test') && isPastOrToday && (
                              <a 
                                href={`/admin/lms/attendance?date=${inspectingDate}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded-md text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Open attendance for this date"
                              >
                                <CheckCircle2 size={10} />
                                Attendance
                              </a>
                            )}

                            {/* Duplicate (+1 Day) */}
                            <button
                              onClick={() => handleDuplicateItem(ev)}
                              className="px-2 py-1 rounded-md text-[10px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Duplicate this topic to tomorrow"
                            >
                              <Copy size={10} />
                              Clone (+1d)
                            </button>

                            {/* Postpone (+1 Day Shift) */}
                            <button
                              onClick={() => handlePostponeItem(ev)}
                              className="px-2 py-1 rounded-md text-[10px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Move this event to tomorrow"
                            >
                              <ArrowRight size={10} />
                              Postpone (+1d)
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
              <div className="text-[10px] text-slate-400">
                Tip: Press <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[9px]">←</kbd> <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[9px]">→</kbd> to switch days
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => setInspectingDate(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      date: inspectingDate,
                      title: "",
                      description: "",
                      type: "class",
                      course_id: selectedCourseId
                    });
                    setInspectingDate(null);
                    setShowAddModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  Add to this Date
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
