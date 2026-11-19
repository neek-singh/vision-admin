"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { X, Loader2, FolderPlus, Sparkles, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import MultiSelect from "@/components/ui/MultiSelect";

interface ModuleFormModalProps {
  courseId: string;
  batchName: string | null;
  mode: "global" | "batch";
  availableBatches: any[];
  onClose: () => void;
  onSuccess: () => void;
  currentModulesCount: number;
  isEditing?: boolean;
  moduleId?: string;
  initialData?: any;
  selectedBatchId?: string;
}

export default function ModuleFormModal({ 
  courseId, 
  batchName, 
  mode, 
  availableBatches, 
  onClose, 
  onSuccess,
  currentModulesCount,
  isEditing = false,
  moduleId,
  initialData,
  selectedBatchId
}: ModuleFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [isGlobal, setIsGlobal] = useState(
    initialData ? (!initialData.batches || initialData.batches.length === 0) : (mode === "global")
  );
  const [batches, setBatches] = useState<string[]>(
    initialData?.batches || 
    (mode === "batch" && selectedBatchId ? [selectedBatchId] : [])
  );

  // Available existing modules across the institute
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedExistingModule, setSelectedExistingModule] = useState<any | null>(null);
  const [copyChaptersAndClasses, setCopyChaptersAndClasses] = useState(true);

  // Searchbar dropdown & keyboard navigation state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch available modules across all courses for 1-click reuse
  useEffect(() => {
    if (isEditing) return;

    const fetchAvailableModules = async () => {
      setLoadingAvailable(true);
      try {
        const { data, error } = await supabase
          .from("lms_modules")
          .select(`
            id,
            title,
            course_id,
            courses (id, title),
            lms_chapters (
              id,
              title,
              order_index,
              lessons (id, title, lesson_type, type, content_url, notes_content, is_free, is_locked, order_index, tags, difficulty)
            ),
            lessons (id, title, lesson_type, type, content_url, notes_content, is_free, is_locked, order_index, tags, difficulty, chapter_id)
          `)
          .order("title", { ascending: true });

        if (!error && data) {
          setAvailableModules(data);
        }
      } catch (err: any) {
        console.warn("Could not fetch available modules (offline or network blip):", err?.message || err);
      } finally {
        setLoadingAvailable(false);
      }
    };

    fetchAvailableModules();
  }, [isEditing]);

  // Click outside listener for the searchbar suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered module suggestions for the searchbar
  const filteredSuggestions = useMemo(() => {
    if (!availableModules || availableModules.length === 0) return [];
    const query = title.trim().toLowerCase();
    if (!query) {
      return availableModules.slice(0, 30);
    }
    return availableModules
      .filter((m) => 
        m.title?.toLowerCase().includes(query) || 
        m.courses?.title?.toLowerCase().includes(query)
      )
      .slice(0, 30);
  }, [availableModules, title]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isDropdownOpen]);

  const selectModule = (m: any) => {
    setTitle(m.title);
    setSelectedExistingModule(m);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        course_id: courseId,
        title: title.trim(),
        subtitle: null,
        batch: mode === "batch" ? batchName : null,
        batches: isGlobal ? [] : batches,
        order_index: isEditing ? (initialData?.order_index ?? (currentModulesCount + 1)) : (currentModulesCount + 1)
      };

      if (isEditing && moduleId) {
        const { error: updateError } = await supabase
          .from("lms_modules")
          .update(payload)
          .eq("id", moduleId);
        if (updateError) throw updateError;
      } else {
        const { data: newModule, error: insertError } = await supabase
          .from("lms_modules")
          .insert(payload)
          .select()
          .single();

        if (insertError) throw insertError;

        // If user picked an existing module AND opted to copy its chapters & classes
        if (newModule && selectedExistingModule && copyChaptersAndClasses) {
          const targetModuleId = newModule.id;

          // 1. Copy Chapters and their lessons
          if (selectedExistingModule.lms_chapters && selectedExistingModule.lms_chapters.length > 0) {
            for (const ch of selectedExistingModule.lms_chapters) {
              const { data: newCh, error: chErr } = await supabase
                .from("lms_chapters")
                .insert({
                  module_id: targetModuleId,
                  course_id: courseId,
                  title: ch.title,
                  order_index: ch.order_index,
                  batches: isGlobal ? [] : batches
                })
                .select()
                .single();

              if (!chErr && newCh && ch.lessons && ch.lessons.length > 0) {
                const lessonPayloads = ch.lessons.map((l: any) => ({
                  course_id: courseId,
                  module_id: targetModuleId,
                  chapter_id: newCh.id,
                  title: l.title,
                  type: 'video',
                  lesson_type: l.lesson_type || l.type || 'video',
                  content_url: l.content_url || '',
                  notes_content: l.notes_content || '',
                  is_free: l.is_free ?? false,
                  is_locked: l.is_locked ?? false,
                  order_index: l.order_index,
                  tags: l.tags || [],
                  difficulty: l.difficulty || 'beginner',
                  batches: isGlobal ? [] : batches
                }));

                await supabase.from("lessons").insert(lessonPayloads);
              }
            }
          }

          // 2. Copy uncategorized lessons in module (if any)
          if (selectedExistingModule.lessons && selectedExistingModule.lessons.length > 0) {
            const uncategorized = selectedExistingModule.lessons.filter((l: any) => !l.chapter_id);
            if (uncategorized.length > 0) {
              const lessonPayloads = uncategorized.map((l: any) => ({
                course_id: courseId,
                module_id: targetModuleId,
                chapter_id: null,
                title: l.title,
                type: 'video',
                lesson_type: l.lesson_type || l.type || 'video',
                content_url: l.content_url || '',
                notes_content: l.notes_content || '',
                is_free: l.is_free ?? false,
                is_locked: l.is_locked ?? false,
                order_index: l.order_index,
                tags: l.tags || [],
                difficulty: l.difficulty || 'beginner',
                batches: isGlobal ? [] : batches
              }));

              await supabase.from("lessons").insert(lessonPayloads);
            }
          }
        }
      }

      onSuccess();
    } catch (err: any) {
      console.warn("Error saving module:", err);
      alert("Error saving module: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStats = useMemo(() => {
    if (!selectedExistingModule) return null;
    const chCount = selectedExistingModule.lms_chapters?.length || 0;
    const lessonCount = (selectedExistingModule.lessons?.length || 0) + 
      (selectedExistingModule.lms_chapters?.reduce((sum: number, c: any) => sum + (c.lessons?.length || 0), 0) || 0);
    return { chCount, lessonCount };
  }, [selectedExistingModule]);

  return (
    <div 
      className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <FolderPlus size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {isEditing ? "Edit Module" : "New Module"}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Organize curriculum into course units
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">

          {/* Module Title with Integrated Autocomplete / Suggestions Dropdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Module Title <span className="text-rose-500">*</span>
              </label>
              {!isEditing && availableModules.length > 0 && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                  {availableModules.length} existing modules available
                </span>
              )}
            </div>

            <div className="relative">
              <div className="relative flex items-center">
                <input 
                  ref={inputRef}
                  autoFocus 
                  required 
                  type="text" 
                  value={title}
                  onFocus={() => { if (!isEditing) setIsDropdownOpen(true); }}
                  onClick={() => { if (!isEditing) setIsDropdownOpen(true); }}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!isEditing) setIsDropdownOpen(true);
                    if (selectedExistingModule && selectedExistingModule.title.toLowerCase() !== e.target.value.toLowerCase()) {
                      setSelectedExistingModule(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!isDropdownOpen || filteredSuggestions.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedIndex(prev => (prev + 1) % filteredSuggestions.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
                    } else if (e.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
                      e.preventDefault();
                      selectModule(filteredSuggestions[highlightedIndex]);
                    }
                  }}
                  placeholder="e.g. Fundamental Concepts, Office Automation..." 
                  className="w-full h-11 pl-3.5 pr-16 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" 
                />

                <div className="absolute right-2.5 flex items-center gap-1">
                  {title && (
                    <button
                      type="button"
                      onClick={() => {
                        setTitle("");
                        setSelectedExistingModule(null);
                        inputRef.current?.focus();
                        if (!isEditing) setIsDropdownOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      title="Clear title"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(prev => !prev)}
                      className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                      title="Toggle available modules list"
                    >
                      <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180 text-blue-600" : ""}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Suggestions Dropdown attached directly to this searchbar */}
              {!isEditing && isDropdownOpen && (
                <div 
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Sparkles size={12} className="text-blue-500" />
                      Available Modules ({filteredSuggestions.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Click to select without typing</span>
                  </div>

                  <div className="max-h-56 overflow-y-auto custom-scrollbar p-1 divide-y divide-slate-100/60 dark:divide-slate-800/60">
                    {loadingAvailable ? (
                      <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                        <Loader2 size={13} className="animate-spin text-blue-500" />
                        <span>Loading available modules...</span>
                      </div>
                    ) : filteredSuggestions.length === 0 ? (
                      <div className="py-5 text-center text-xs text-slate-400">
                        No matching existing module. Type to create new!
                      </div>
                    ) : (
                      filteredSuggestions.map((m, idx) => {
                        const chCount = m.lms_chapters?.length || 0;
                        const totalClasses = (m.lessons?.length || 0) + (m.lms_chapters?.reduce((acc: number, c: any) => acc + (c.lessons?.length || 0), 0) || 0);
                        const isHighlighted = highlightedIndex === idx;
                        const isSelected = selectedExistingModule?.id === m.id || title.trim().toLowerCase() === m.title.toLowerCase();

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onClick={() => selectModule(m)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : isHighlighted
                                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-950 dark:text-blue-200"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className={`font-semibold truncate ${isSelected ? "text-white" : ""}`}>
                                {m.title}
                              </div>
                              <div className={`text-[10px] truncate mt-0.5 ${
                                isSelected ? "text-blue-100" : "text-slate-400 dark:text-slate-500"
                              }`}>
                                {m.courses?.title || "Standard Course"}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                isSelected
                                  ? "bg-blue-700/60 text-blue-100"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              }`}>
                                {chCount} ch &bull; {totalClasses} classes
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* If an existing module was picked, optional import prompt */}
            {selectedExistingModule && selectedStats && selectedStats.chCount > 0 && (
              <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 animate-in fade-in duration-200">
                <label className="flex items-start gap-2 text-xs text-blue-950 dark:text-blue-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={copyChaptersAndClasses}
                    onChange={(e) => setCopyChaptersAndClasses(e.target.checked)}
                    className="mt-0.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 accent-blue-600"
                  />
                  <span className="leading-tight text-[11px]">
                    <strong>Also import content:</strong> copy {selectedStats.chCount} chapters & {selectedStats.lessonCount} classes from {selectedExistingModule.courses?.title || "selected module"}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Global Toggle Card */}
          <label 
            htmlFor="is_global_module"
            className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer transition-all select-none"
          >
            <div className="pt-0.5">
              <input 
                type="checkbox" 
                id="is_global_module"
                checked={isGlobal}
                onChange={(e) => {
                  setIsGlobal(e.target.checked);
                  if (e.target.checked) setBatches([]);
                }}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500/20 cursor-pointer accent-blue-600"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Global Module
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  All Batches
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                Visible to all current and future batches in this course.
              </p>
            </div>
          </label>

          {/* Batch Selector if not global */}
          {!isGlobal && (
            <div className="space-y-1.5 pt-1">
              <MultiSelect 
                label="Assign to Specific Batches"
                options={availableBatches.map(b => ({ value: b.id, label: b.batch_display }))}
                selected={batches}
                onChange={setBatches}
              />
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>
                  {isEditing 
                    ? "Save Changes" 
                    : selectedExistingModule && copyChaptersAndClasses && selectedStats && selectedStats.chCount > 0
                      ? `Create & Import (${selectedStats.chCount} chapters)`
                      : "Create Module"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
