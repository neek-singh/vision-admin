"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  Sparkles,
  Clipboard,
  Trash2,
  CheckSquare,
  Square,
  Folder,
  Video,
  BookOpen,
  Award,
  FolderCode,
  HelpCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
  Layers,
  FileText
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  parseBulkClasses,
  parseFullCurriculumTree,
  ParsedClassItem,
  ParsedChapterItem,
  ParseOptions
} from "@/lib/lms/curriculumParser";

export type BulkImportMode = "chapter_classes" | "module_tree";

interface CurriculumBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: BulkImportMode;
  courseId: string;
  moduleId: string;
  chapterId?: string;
  chapterTitle?: string;
  moduleTitle?: string;
  currentCount?: number;
  currentMode?: "global" | "batch";
  selectedBatchId?: string;
}

const TYPE_CONFIG = {
  video: { label: "Video", icon: Video, color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40" },
  notes: { label: "Notes", icon: BookOpen, color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40" },
  assignment: { label: "Assignment", icon: Award, color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40" },
  project: { label: "Project", icon: FolderCode, color: "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/40" },
  mcq: { label: "Quiz", icon: HelpCircle, color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40" },
};

const SAMPLE_CHAPTER_CLASSES = `|   ├── 01 Introduction to CSS
|   ├── 02 CSS Syntax and Selectors
|   ├── 03 Colors, Backgrounds, and Borders
|   ├── 04 Box Model (Margin, Padding, Content)
|   ├── 05 Display, Positioning, and Float
|   ├── 06 Flexbox Deep Dive
|   ├── 07 CSS Grid Layout Masterclass
|   ├── 08 Responsive Design Assignment
|   ├── 09 CSS Portfolio Project
|   ├── 10 CSS & Layout Quiz`;

const SAMPLE_MODULE_TREE = `├── 01 HTML5 Foundations
|   ├── 01 Introduction to Web & HTML
|   ├── 02 Elements, Tags, and Attributes
|   ├── 03 HTML Tables and Forms
|   ├── 04 Semantic HTML Project
├── 02 Modern CSS
|   ├── 01 CSS Syntax & Selectors
|   ├── 02 Colors, Borders, and Shadows
|   ├── 03 Box Model & Display
|   ├── 04 Flexbox & Grid Masterclass
|   ├── 05 Responsive Web Design
|   ├── 06 CSS Quiz Test
├── 03 JavaScript Essentials
|   ├── 01 JS Variables & Data Types
|   ├── 02 Functions and Scope
|   ├── 03 DOM Manipulation
|   ├── 04 Interactive Calculator Project`;

export default function CurriculumBulkImportModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  courseId,
  moduleId,
  chapterId,
  chapterTitle,
  moduleTitle,
  currentCount = 0,
  currentMode = "global",
  selectedBatchId,
}: CurriculumBulkImportModalProps) {
  const [rawText, setRawText] = useState("");
  const [defaultType, setDefaultType] = useState<'video' | 'notes' | 'assignment' | 'project' | 'mcq'>('video');
  const [autoDetectType, setAutoDetectType] = useState(true);
  const [keepNumbering, setKeepNumbering] = useState(true);

  // Parsed states (allowing user edits before committing)
  const [parsedClasses, setParsedClasses] = useState<ParsedClassItem[]>([]);
  const [parsedChapters, setParsedChapters] = useState<ParsedChapterItem[]>([]);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"input" | "preview">("input");

  // Re-parse when input text or parse options change
  useEffect(() => {
    const options: ParseOptions = {
      defaultType,
      autoDetectType,
      keepNumbering,
    };

    if (mode === "chapter_classes") {
      const items = parseBulkClasses(rawText, options);
      setParsedClasses(items);
    } else {
      const items = parseFullCurriculumTree(rawText, options);
      setParsedChapters(items);
    }
  }, [rawText, defaultType, autoDetectType, keepNumbering, mode]);

  // Load sample on initial open if empty
  const handleLoadSample = () => {
    if (mode === "chapter_classes") {
      setRawText(SAMPLE_CHAPTER_CLASSES);
    } else {
      setRawText(SAMPLE_MODULE_TREE);
    }
    setActiveTab("preview");
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        setActiveTab("preview");
      }
    } catch {
      // ignore clipboard permission error
    }
  };

  // Selection helpers for single-chapter classes
  const selectedClassesCount = useMemo(
    () => parsedClasses.filter((c) => c.selected).length,
    [parsedClasses]
  );

  const toggleSelectAllClasses = () => {
    const allSelected = parsedClasses.every((c) => c.selected);
    setParsedClasses((prev) => prev.map((c) => ({ ...c, selected: !allSelected })));
  };

  const updateClassTitle = (id: string, newTitle: string) => {
    setParsedClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  const updateClassType = (
    id: string,
    newType: 'video' | 'notes' | 'assignment' | 'project' | 'mcq'
  ) => {
    setParsedClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, type: newType } : c))
    );
  };

  const toggleClassSelect = (id: string) => {
    setParsedClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const removeClass = (id: string) => {
    setParsedClasses((prev) => prev.filter((c) => c.id !== id));
  };

  // Selection helpers for module tree
  const totalTreeStats = useMemo(() => {
    const selChaps = parsedChapters.filter((c) => c.selected);
    let selClasses = 0;
    selChaps.forEach((ch) => {
      selClasses += ch.classes.filter((cl) => cl.selected).length;
    });
    return { chapters: selChaps.length, classes: selClasses };
  }, [parsedChapters]);

  const toggleSelectAllTree = () => {
    const allSelected = parsedChapters.every((ch) => ch.selected);
    setParsedChapters((prev) =>
      prev.map((ch) => ({
        ...ch,
        selected: !allSelected,
        classes: ch.classes.map((cl) => ({ ...cl, selected: !allSelected })),
      }))
    );
  };

  const toggleChapterSelect = (chId: string) => {
    setParsedChapters((prev) =>
      prev.map((ch) => {
        if (ch.id === chId) {
          const nextVal = !ch.selected;
          return {
            ...ch,
            selected: nextVal,
            classes: ch.classes.map((cl) => ({ ...cl, selected: nextVal })),
          };
        }
        return ch;
      })
    );
  };

  const updateChapterTitle = (chId: string, title: string) => {
    setParsedChapters((prev) =>
      prev.map((ch) => (ch.id === chId ? { ...ch, title } : ch))
    );
  };

  const removeChapter = (chId: string) => {
    setParsedChapters((prev) => prev.filter((ch) => ch.id !== chId));
  };

  const toggleTreeClassSelect = (chId: string, clId: string) => {
    setParsedChapters((prev) =>
      prev.map((ch) => {
        if (ch.id === chId) {
          return {
            ...ch,
            classes: ch.classes.map((cl) =>
              cl.id === clId ? { ...cl, selected: !cl.selected } : cl
            ),
          };
        }
        return ch;
      })
    );
  };

  const updateTreeClassTitle = (chId: string, clId: string, title: string) => {
    setParsedChapters((prev) =>
      prev.map((ch) => {
        if (ch.id === chId) {
          return {
            ...ch,
            classes: ch.classes.map((cl) =>
              cl.id === clId ? { ...cl, title } : cl
            ),
          };
        }
        return ch;
      })
    );
  };

  const updateTreeClassType = (
    chId: string,
    clId: string,
    newType: 'video' | 'notes' | 'assignment' | 'project' | 'mcq'
  ) => {
    setParsedChapters((prev) =>
      prev.map((ch) => {
        if (ch.id === chId) {
          return {
            ...ch,
            classes: ch.classes.map((cl) =>
              cl.id === clId ? { ...cl, type: newType } : cl
            ),
          };
        }
        return ch;
      })
    );
  };

  const removeTreeClass = (chId: string, clId: string) => {
    setParsedChapters((prev) =>
      prev.map((ch) => {
        if (ch.id === chId) {
          return {
            ...ch,
            classes: ch.classes.filter((cl) => cl.id !== clId),
          };
        }
        return ch;
      })
    );
  };

  // Perform bulk insertion
  const handleImport = async () => {
    if (!courseId || !moduleId) return;

    const targetBatches =
      currentMode === "batch" && selectedBatchId ? [selectedBatchId] : [];

    setIsSubmitting(true);
    try {
      if (mode === "chapter_classes") {
        if (!chapterId) {
          alert("Chapter ID is missing.");
          setIsSubmitting(false);
          return;
        }

        const itemsToInsert = parsedClasses.filter((c) => c.selected && c.title.trim().length > 0);
        if (itemsToInsert.length === 0) {
          alert("Please select at least one class to import.");
          setIsSubmitting(false);
          return;
        }

        setProgressMsg(`Importing ${itemsToInsert.length} classes...`);

        const startIndex = currentCount + 1;
        const payloads = itemsToInsert.map((item, idx) => ({
          module_id: moduleId,
          chapter_id: chapterId,
          course_id: courseId,
          title: item.title.trim(),
          type: "video", // Workaround for DB check constraint
          lesson_type: item.type,
          content_url: "",
          notes_content:
            item.type === "notes" || item.type === "assignment" || item.type === "project"
              ? "<p></p>"
              : "",
          pdf_url: null,
          duration: null,
          is_free: false,
          is_locked: false,
          batches: targetBatches,
          order_index: startIndex + idx,
        }));

        const { error } = await supabase.from("lessons").insert(payloads);
        if (error) {
          throw error;
        }

        onSuccess();
        onClose();
      } else {
        // Mode: module_tree (Import Chapters + child Classes)
        const chaptersToInsert = parsedChapters.filter(
          (ch) => ch.selected && ch.title.trim().length > 0
        );

        if (chaptersToInsert.length === 0) {
          alert("Please select at least one chapter to import.");
          setIsSubmitting(false);
          return;
        }

        let chapterOrder = currentCount + 1;

        for (let i = 0; i < chaptersToInsert.length; i++) {
          const ch = chaptersToInsert[i];
          setProgressMsg(
            `Creating chapter ${i + 1} of ${chaptersToInsert.length}: "${ch.title}"...`
          );

          // 1. Insert Chapter
          const { data: newChapter, error: chErr } = await supabase
            .from("lms_chapters")
            .insert({
              module_id: moduleId,
              course_id: courseId,
              title: ch.title.trim(),
              batches: targetBatches,
              order_index: chapterOrder++,
            })
            .select("id")
            .single();

          if (chErr || !newChapter?.id) {
            throw new Error(`Failed to create chapter "${ch.title}": ${chErr?.message}`);
          }

          // 2. Insert child classes for this chapter
          const validClasses = ch.classes.filter(
            (cl) => cl.selected && cl.title.trim().length > 0
          );

          if (validClasses.length > 0) {
            setProgressMsg(
              `Adding ${validClasses.length} classes to "${ch.title}"...`
            );

            const lessonPayloads = validClasses.map((item, cIdx) => ({
              module_id: moduleId,
              chapter_id: newChapter.id,
              course_id: courseId,
              title: item.title.trim(),
              type: "video", // DB constraint workaround
              lesson_type: item.type,
              content_url: "",
              notes_content:
                item.type === "notes" || item.type === "assignment" || item.type === "project"
                  ? "<p></p>"
                  : "",
              pdf_url: null,
              duration: null,
              is_free: false,
              is_locked: false,
              batches: targetBatches,
              order_index: cIdx + 1,
            }));

            const { error: lessonErr } = await supabase
              .from("lessons")
              .insert(lessonPayloads);

            if (lessonErr) {
              console.error("Error inserting lessons for chapter:", lessonErr);
            }
          }
        }

        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error("Bulk import failed:", err);
      alert("Import failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
      setProgressMsg("");
    }
  };

  if (!isOpen) return null;

  const isTreeMode = mode === "module_tree";

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[120] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              {isTreeMode ? <Layers size={20} /> : <FileText size={20} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
                {isTreeMode ? "Import Chapters & Classes Tree" : "Bulk Import Classes"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isTreeMode
                  ? `Into Module: "${moduleTitle || "Current Module"}"`
                  : `Into Chapter: "${chapterTitle || "Current Chapter"}"`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Tab Switcher */}
            <div className="flex lg:hidden bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("input")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === "input"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Paste Outline
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === "preview"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Preview ({isTreeMode ? totalTreeStats.classes : selectedClassesCount})
              </button>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0">
          
          {/* Left Column: Input and parsing settings */}
          <div
            className={`lg:col-span-5 border-r border-slate-100 dark:border-slate-800 flex flex-col p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-900/30 ${
              activeTab === "input" ? "block" : "hidden lg:flex"
            }`}
          >
            {/* Action Bar above Textarea */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                Paste Outline / AI Tree
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <Clipboard size={12} />
                  Paste
                </button>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Load Sample
                </button>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => setRawText("")}
                    className="text-[11px] font-medium text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Textarea */}
            <div className="relative flex-1 min-h-[220px]">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={
                  isTreeMode
                    ? `Paste ChatGPT ASCII tree or syllabus, e.g.:\n\n├── 01 HTML Foundations\n|   ├── 01 Introduction to HTML\n|   ├── 02 HTML Tags & Attributes\n├── 02 Modern CSS\n|   ├── 01 CSS Syntax & Selectors\n|   ├── 02 Flexbox & Grid\n|   ├── 03 CSS Quiz`
                    : `Paste list of classes or ChatGPT output, e.g.:\n\n|   ├── 01 Introduction to CSS\n|   ├── 02 CSS Syntax and Selectors\n|   ├── 03 Colors & Backgrounds\n|   ├── 04 Flexbox Deep Dive\n|   ├── 05 CSS Portfolio Project\n|   ├── 06 CSS Quiz`
                }
                rows={10}
                className="w-full h-full p-3 font-mono text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 leading-relaxed"
              />
            </div>

            {/* Settings & Parsing Options */}
            <div className="bg-white dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Import Settings
              </h3>

              {/* Default Lesson Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Default Class Type
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map((t) => {
                    const cfg = TYPE_CONFIG[t];
                    const Icon = cfg.icon;
                    const isSelected = defaultType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDefaultType(t)}
                        className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border text-[11px] transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <Icon size={14} className="mb-0.5" />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoDetectType}
                    onChange={(e) => setAutoDetectType(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>
                    Auto-detect type from title (Quiz, Project, Assignment, Notes)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={keepNumbering}
                    onChange={(e) => setKeepNumbering(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>
                    Keep leading numbers in titles (e.g. "01 Introduction")
                  </span>
                </label>
              </div>
            </div>

            {/* Quick Helper Note */}
            <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              💡 Supports ChatGPT tree format (<code className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">├──</code>, <code className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">|</code>), Markdown headers (<code className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">##</code>), or simple lists.
            </div>
          </div>

          {/* Right Column: Live Interactive Preview */}
          <div
            className={`lg:col-span-7 flex flex-col p-4 sm:p-5 overflow-hidden bg-white dark:bg-slate-900 ${
              activeTab === "preview" ? "block" : "hidden lg:flex"
            }`}
          >
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Parsed Preview
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
                  {isTreeMode
                    ? `${totalTreeStats.chapters} Chapters · ${totalTreeStats.classes} Classes`
                    : `${selectedClassesCount} of ${parsedClasses.length} selected`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={isTreeMode ? toggleSelectAllTree : toggleSelectAllClasses}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium cursor-pointer inline-flex items-center gap-1"
                >
                  {(isTreeMode ? parsedChapters.every((c) => c.selected) : parsedClasses.every((c) => c.selected)) ? (
                    <>
                      <Square size={13} /> Deselect All
                    </>
                  ) : (
                    <>
                      <CheckSquare size={13} /> Select All
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview Content Area */}
            <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 min-h-[300px]">
              
              {/* Empty state */}
              {((isTreeMode && parsedChapters.length === 0) ||
                (!isTreeMode && parsedClasses.length === 0)) && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <Sparkles size={22} />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    No classes parsed yet
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">
                    Paste your ChatGPT response, syllabus outline, or tree structure on the left to see instant preview cards.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Sparkles size={13} />
                    Load Sample Preview
                  </button>
                </div>
              )}

              {/* Mode A: Single Chapter Classes List */}
              {!isTreeMode &&
                parsedClasses.map((item, idx) => {
                  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.video;
                  const Icon = cfg.icon;

                  return (
                    <div
                      key={item.id}
                      className={`group flex items-center gap-2 p-2 rounded-xl border transition-all ${
                        item.selected
                          ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80"
                          : "opacity-40 bg-transparent border-slate-100 dark:border-slate-800"
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleClassSelect(item.id)}
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 cursor-pointer shrink-0"
                      >
                        {item.selected ? (
                          <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>

                      {/* Index badge */}
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 w-6 text-center shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>

                      {/* Editable Title */}
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateClassTitle(item.id, e.target.value)}
                        className="flex-1 bg-transparent text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-b focus:border-blue-500 px-1 py-0.5"
                      />

                      {/* Type Selector Dropdown Badge */}
                      <div className="relative shrink-0">
                        <select
                          value={item.type}
                          onChange={(e) =>
                            updateClassType(
                              item.id,
                              e.target.value as any
                            )
                          }
                          className={`text-[11px] font-medium pl-2 pr-6 py-0.5 rounded-md border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${cfg.color}`}
                        >
                          <option value="video">Video</option>
                          <option value="notes">Notes</option>
                          <option value="assignment">Assignment</option>
                          <option value="project">Project</option>
                          <option value="mcq">Quiz</option>
                        </select>
                        <ChevronDown
                          size={11}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeClass(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}

              {/* Mode B: Full Module Tree (Chapters + Child Classes) */}
              {isTreeMode &&
                parsedChapters.map((chapter, chIdx) => (
                  <div
                    key={chapter.id}
                    className={`border rounded-xl transition-all overflow-hidden ${
                      chapter.selected
                        ? "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800"
                        : "opacity-40 border-slate-150 dark:border-slate-800"
                    }`}
                  >
                    {/* Chapter Header */}
                    <div className="flex items-center gap-2 p-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => toggleChapterSelect(chapter.id)}
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 cursor-pointer shrink-0"
                      >
                        {chapter.selected ? (
                          <CheckSquare size={16} className="text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>

                      <Folder size={15} className="text-amber-500 shrink-0" />

                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        CH {String(chIdx + 1).padStart(2, "0")}
                      </span>

                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(e) => updateChapterTitle(chapter.id, e.target.value)}
                        className="flex-1 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-b focus:border-blue-500 px-1 py-0.5"
                      />

                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        {chapter.classes.filter((c) => c.selected).length} classes
                      </span>

                      <button
                        type="button"
                        onClick={() => removeChapter(chapter.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
                        title="Remove chapter"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Child Classes */}
                    <div className="p-2 space-y-1.5 pl-6 sm:pl-8">
                      {chapter.classes.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic py-1">
                          No classes detected under this chapter.
                        </p>
                      )}
                      {chapter.classes.map((cl, clIdx) => {
                        const cfg = TYPE_CONFIG[cl.type] || TYPE_CONFIG.video;

                        return (
                          <div
                            key={cl.id}
                            className={`group flex items-center gap-2 p-1.5 rounded-lg border transition-all ${
                              cl.selected
                                ? "bg-white dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/60"
                                : "opacity-40 border-slate-100 dark:border-slate-800 bg-transparent"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleTreeClassSelect(chapter.id, cl.id)}
                              className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 cursor-pointer shrink-0"
                            >
                              {cl.selected ? (
                                <CheckSquare size={14} className="text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Square size={14} />
                              )}
                            </button>

                            <span className="text-[10px] font-mono text-slate-400 w-5 text-center shrink-0">
                              {String(clIdx + 1).padStart(2, "0")}
                            </span>

                            <input
                              type="text"
                              value={cl.title}
                              onChange={(e) =>
                                updateTreeClassTitle(chapter.id, cl.id, e.target.value)
                              }
                              className="flex-1 bg-transparent text-xs font-normal text-slate-800 dark:text-slate-100 focus:outline-none focus:border-b focus:border-blue-500 px-1 py-0.5"
                            />

                            <div className="relative shrink-0">
                              <select
                                value={cl.type}
                                onChange={(e) =>
                                  updateTreeClassType(
                                    chapter.id,
                                    cl.id,
                                    e.target.value as any
                                  )
                                }
                                className={`text-[10px] font-medium pl-2 pr-5 py-0.5 rounded border appearance-none cursor-pointer focus:outline-none ${cfg.color}`}
                              >
                                <option value="video">Video</option>
                                <option value="notes">Notes</option>
                                <option value="assignment">Assignment</option>
                                <option value="project">Project</option>
                                <option value="mcq">Quiz</option>
                              </select>
                              <ChevronDown
                                size={10}
                                className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeTreeClass(chapter.id, cl.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                              title="Remove class"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {progressMsg ? (
              <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                <Loader2 size={13} className="animate-spin" />
                {progressMsg}
              </span>
            ) : isTreeMode ? (
              <span>
                Ready to create: <strong>{totalTreeStats.chapters}</strong> chapters and{" "}
                <strong>{totalTreeStats.classes}</strong> classes
              </span>
            ) : (
              <span>
                Ready to create: <strong>{selectedClassesCount}</strong> classes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={
                isSubmitting ||
                (isTreeMode ? totalTreeStats.classes === 0 && totalTreeStats.chapters === 0 : selectedClassesCount === 0)
              }
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  {isTreeMode
                    ? `Import ${totalTreeStats.chapters} Chapters & ${totalTreeStats.classes} Classes`
                    : `Import ${selectedClassesCount} Classes`}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
