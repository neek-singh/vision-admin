"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Plus, 
  Clock, 
  BookOpen, 
  FileText, 
  PenTool, 
  X, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  LayoutGrid, 
  List, 
  Filter, 
  Users, 
  CheckCircle2,
  CalendarDays,
  Search,
  ArrowRight,
  Sparkles,
  Info
} from "lucide-react";
import { createSchedule, deleteSchedule, getCurriculumTopics } from "@/app/actions/schedule";

const TYPE_CFG: Record<string, { bg: string, text: string, border: string, icon: any, label: string, accent: string }> = {
  class: { 
    bg: "bg-blue-50/50", 
    text: "text-blue-700", 
    border: "border-blue-100", 
    accent: "bg-blue-600",
    icon: <BookOpen size={14} />, 
    label: "Class" 
  },
  test: { 
    bg: "bg-rose-50/50", 
    text: "text-rose-700", 
    border: "border-rose-100", 
    accent: "bg-rose-600",
    icon: <FileText size={14} />, 
    label: "Test" 
  },
  assignment: { 
    bg: "bg-amber-50/50", 
    text: "text-amber-700", 
    border: "border-amber-100", 
    accent: "bg-amber-600",
    icon: <PenTool size={14} />, 
    label: "Task" 
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
  
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [selectedBatch, setSelectedBatch] = useState("All Batches");
  const [activeTab, setActiveTab] = useState<'lessons' | 'tests' | 'assignments'>('lessons');
  const [loading, setLoading] = useState(false);
  const [curriculum, setCurriculum] = useState<{ modules: any[], tests: any[], assignments: any[] }>({ modules: [], tests: [], assignments: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    course_id: "",
    type: "class" as any,
    title: "",
    description: "",
    date: fmt(today),
    start_time: "09:00",
    end_time: "10:30",
    batch: "All Batches"
  });

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

  // Fetch curriculum when course changes
  useEffect(() => {
    if (selectedCourseId) {
      getCurriculumTopics(selectedCourseId).then(setCurriculum);
    }
  }, [selectedCourseId]);

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    let s = initialSchedules;
    if (selectedCourseId) s = s.filter(x => x.course_id === selectedCourseId);
    if (selectedBatch !== "All Batches") s = s.filter(x => x.batch === selectedBatch);
    return s;
  }, [initialSchedules, selectedCourseId, selectedBatch]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else { setCurrentMonth(m => m - 1); }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else { setCurrentMonth(m => m + 1); }
  };

  // Calculate available items (not yet scheduled for THIS batch)
  const alreadyScheduledMap = useMemo(() => {
    const map = new Set();
    initialSchedules
      .filter(s => s.course_id === selectedCourseId && s.batch === selectedBatch)
      .forEach(s => map.add(`${s.type}:${s.title}`));
    return map;
  }, [initialSchedules, selectedCourseId, selectedBatch]);

  const availableLessons = useMemo(() => {
    return curriculum.modules.flatMap(mod => 
      (mod.lessons || []).map((l: any) => ({
        ...l,
        moduleTitle: mod.title,
        fullTitle: `${mod.title}: ${l.title}`,
        isScheduled: alreadyScheduledMap.has(`class:${mod.title}: ${l.title}`)
      }))
    ).filter(l => !searchQuery || l.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [curriculum.modules, alreadyScheduledMap, searchQuery]);

  const availableTests = useMemo(() => {
    return curriculum.tests.map(t => ({
      ...t,
      fullTitle: `Test: ${t.title}`,
      isScheduled: alreadyScheduledMap.has(`test:Test: ${t.title}`)
    })).filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [curriculum.tests, alreadyScheduledMap, searchQuery]);

  const availableAssignments = useMemo(() => {
    return curriculum.assignments.map(a => ({
      ...a,
      fullTitle: `Assignment: ${a.title}`,
      isScheduled: alreadyScheduledMap.has(`assignment:Assignment: ${a.title}`)
    })).filter(a => !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [curriculum.assignments, alreadyScheduledMap, searchQuery]);

  const handleQuickSchedule = (item: any, type: 'class' | 'test' | 'assignment') => {
    // Find batch timing from the new structure
    const batchInfo = batchesList.find(b => b.title === selectedBatch);
    let startTime = "09:00";
    let endTime = "10:30";
    
    // Use the timing field from the batches table (e.g., "08:00 AM - 10:00 AM")
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

    setFormData({
      course_id: selectedCourseId,
      type,
      title: item.fullTitle,
      description: `${type === 'class' ? 'Lesson' : type === 'test' ? 'Examination' : 'Practical Task'}: ${item.title}`,
      date: fmt(today),
      start_time: startTime,
      end_time: endTime,
      batch: selectedBatch
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this event from schedule?")) return;
    await deleteSchedule(id);
    router.refresh();
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
    for (const s of filteredSchedules) {
      await deleteSchedule(s.id);
    }
    router.refresh();
    setLoading(false);
    alert(`Successfully removed ${count} items.`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 -mt-6 -mx-6 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Top bar with selectors */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
               <BookOpen size={16} className="text-blue-600" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</span>
               <select 
                value={selectedCourseId} 
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="bg-transparent text-sm font-black text-slate-900 outline-none cursor-pointer"
               >
                 {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
               </select>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
               <Users size={16} className="text-indigo-600" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch</span>
               <select 
                value={selectedBatch} 
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="bg-transparent text-sm font-black text-slate-900 outline-none cursor-pointer"
               >
                 <option value="All Batches">All Batches</option>
                 {batchesList.map((b, i) => (
                   <option key={i} value={b.title}>{b.title}</option>
                 ))}
               </select>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
             <div className="hidden lg:flex items-center gap-6 px-6 py-2">
                <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
                   <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16} /></button>
                   <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><List size={16} /></button>
                </div>
                <div className="text-center border-r border-slate-100 pr-6">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Scheduled</p>
                   <p className="text-lg font-black text-slate-900">{filteredSchedules.length}</p>
                </div>
                <button 
                  onClick={handleClearAll}
                  disabled={filteredSchedules.length === 0}
                  className="text-[9px] font-black text-rose-500 hover:text-rose-700 disabled:opacity-30 uppercase tracking-widest underline underline-offset-4"
                >
                  Clear Selection
                </button>
             </div>
             <button 
              onClick={() => {
                setFormData({...formData, title: "", description: "", type: "class"});
                setShowAddModal(true);
              }}
              className="px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-slate-200 active:scale-95"
             >
                <Plus size={16} /> New Entry
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Curriculum Bank */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6">
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                <div className="p-6 border-b border-slate-100 space-y-4">
                   <div className="flex items-center justify-between">
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Curriculum Library</h2>
                      <Sparkles size={16} className="text-amber-500" />
                   </div>
                   
                   {/* Search */}
                   <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-blue-300 transition-all"
                      />
                   </div>

                   {/* Tabs */}
                   <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                      <button onClick={() => setActiveTab('lessons')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'lessons' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Lessons</button>
                      <button onClick={() => setActiveTab('tests')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'tests' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400'}`}>Tests</button>
                      <button onClick={() => setActiveTab('assignments')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'assignments' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400'}`}>Tasks</button>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                   {activeTab === 'lessons' && (
                     availableLessons.length > 0 ? (
                       availableLessons.map((lesson, idx) => (
                         <div key={idx} className={`group p-4 rounded-2xl border transition-all ${lesson.isScheduled ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md cursor-pointer'}`}>
                            <div className="flex items-start justify-between gap-3">
                               <div className="min-w-0">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{lesson.moduleTitle}</p>
                                  <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">{lesson.title}</h4>
                               </div>
                               {lesson.isScheduled ? (
                                 <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                               ) : (
                                 <button onClick={() => handleQuickSchedule(lesson, 'class')} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-600 hover:text-white">
                                    <Plus size={14} />
                                 </button>
                               )}
                            </div>
                         </div>
                       ))
                     ) : (
                       <div className="py-20 text-center space-y-4">
                          <BookOpen size={32} className="mx-auto text-slate-200" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No lessons found</p>
                       </div>
                     )
                   )}

                   {activeTab === 'tests' && (
                     availableTests.length > 0 ? (
                       availableTests.map((test, idx) => (
                        <div key={idx} className={`group p-4 rounded-2xl border transition-all ${test.isScheduled ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-rose-200 hover:shadow-md cursor-pointer'}`}>
                            <div className="flex items-start justify-between gap-3">
                               <div className="min-w-0">
                                  <h4 className="text-xs font-black text-slate-900 group-hover:text-rose-600 transition-colors">{test.title}</h4>
                               </div>
                               {test.isScheduled ? (
                                 <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                               ) : (
                                 <button onClick={() => handleQuickSchedule(test, 'test')} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white">
                                    <Plus size={14} />
                                 </button>
                               )}
                            </div>
                         </div>
                       ))
                     ) : (
                       <div className="py-20 text-center space-y-4">
                          <FileText size={32} className="mx-auto text-slate-200" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No tests found</p>
                       </div>
                     )
                   )}

                   {activeTab === 'assignments' && (
                     availableAssignments.length > 0 ? (
                       availableAssignments.map((assign, idx) => (
                        <div key={idx} className={`group p-4 rounded-2xl border transition-all ${assign.isScheduled ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-amber-200 hover:shadow-md cursor-pointer'}`}>
                            <div className="flex items-start justify-between gap-3">
                               <div className="min-w-0">
                                  <h4 className="text-xs font-black text-slate-900 group-hover:text-amber-600 transition-colors">{assign.title}</h4>
                               </div>
                               {assign.isScheduled ? (
                                 <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                               ) : (
                                 <button onClick={() => handleQuickSchedule(assign, 'assignment')} className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-amber-600 hover:text-white">
                                    <Plus size={14} />
                                 </button>
                               )}
                            </div>
                         </div>
                       ))
                     ) : (
                       <div className="py-20 text-center space-y-4">
                          <PenTool size={32} className="mx-auto text-slate-200" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No tasks found</p>
                       </div>
                     )
                   )}
                </div>
             </div>
          </div>

          {/* Right Column: Interactive Calendar or List View */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
             {viewMode === 'calendar' ? (
               <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[700px] flex flex-col">
                  
                  {/* Calendar Header */}
                  <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                           <CalendarDays size={20} />
                        </div>
                        <div>
                           <h2 className="text-lg font-black text-slate-900 leading-tight">{monthNames[currentMonth]} {currentYear}</h2>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Overview</p>
                        </div>
                     </div>
  
                     <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <button onClick={handlePrevMonth} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600"><ChevronLeft size={18} /></button>
                        <button onClick={() => {setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear());}} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-white shadow-sm rounded-xl border border-blue-50">Today</button>
                        <button onClick={handleNextMonth} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600"><ChevronRight size={18} /></button>
                     </div>
                  </div>
  
                  {/* Grid Header Days */}
                  <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                     {dayNames.map((d, i) => (
                        <div key={i} className="p-3 text-center border-r border-slate-100 last:border-r-0">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{d}</p>
                        </div>
                     ))}
                  </div>
  
                  <div className="grid grid-cols-7 flex-1">
                     {days.map((d, i) => {
                       const dateStr = d.dateStr;
                       const isToday = dateStr === fmt(today);
                       const dayEvents = dateStr ? filteredSchedules.filter(s => s.date === dateStr).sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || '')) : [];
                       
                       return (
                          <div 
                            key={i} 
                            className={`border-r border-slate-100 last:border-r-0 p-2 min-h-[140px] flex flex-col gap-1 transition-colors ${!d.currentMonth ? 'bg-slate-50/40 opacity-40' : isToday ? 'bg-blue-50/20' : 'hover:bg-slate-50/30'}`}
                          >
                             <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-black ${isToday ? 'bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>
                                   {d.day}
                                </span>
                             </div>
                             
                             <div className="space-y-1 overflow-y-auto custom-scrollbar max-h-[100px]">
                               {dayEvents.map((ev: any) => {
                                 const c = cfg(ev.type);
                                 return (
                                   <div key={ev.id} className={`group relative px-2 py-1 rounded-lg ${c.bg} border ${c.border} border-l-2 ${c.accent.replace('bg-', 'border-')} shadow-sm transition-all overflow-hidden`}>
                                      <div className="flex items-center justify-between gap-1">
                                        <h5 className="text-[8px] font-black text-slate-900 truncate leading-tight flex-1">{ev.title}</h5>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleDelete(ev.id); }}
                                          className="p-0.5 hover:text-rose-600 text-slate-300 opacity-0 group-hover:opacity-100"
                                        >
                                          <Trash2 size={8} />
                                        </button>
                                      </div>
                                   </div>
                                 );
                               })}
                             </div>
  
                             {d.currentMonth && (
                               <button 
                                onClick={() => { setFormData({...formData, date: dateStr}); setShowAddModal(true); }}
                                className="w-full py-1 border border-dashed border-slate-100 rounded-lg flex items-center justify-center text-slate-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-400 transition-all mt-auto"
                               >
                                  <Plus size={12} />
                               </button>
                             )}
                          </div>
                       )
                     })}
                  </div>
               </div>
             ) : (
               /* List View */
               <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Schedule History & Management</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {filteredSchedules.length === 0 ? (
                      <div className="py-40 text-center space-y-4">
                        <Calendar size={48} className="mx-auto text-slate-200" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No scheduled items for this selection</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredSchedules
                          .sort((a: any, b: any) => b.date.localeCompare(a.date))
                          .map((ev: any) => {
                          const c = cfg(ev.type);
                          return (
                            <div key={ev.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-6">
                                <div className="text-center w-16">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                    {new Date(ev.date).toLocaleDateString('en-US', { month: 'short' })}
                                  </p>
                                  <p className="text-2xl font-black text-slate-900 leading-tight mt-1">{ev.date.split('-')[2]}</p>
                                </div>
                                <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center border ${c.border}`}>
                                  {c.icon}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-black text-slate-900 leading-tight">{ev.title}</h4>
                                    <span className={`px-2 py-0.5 rounded-md ${c.accent} text-white text-[7px] font-black uppercase tracking-widest`}>
                                      {c.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-slate-500">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                      <Clock size={12} className="text-slate-400" /> {ev.start_time?.slice(0, 5)} - {ev.end_time?.slice(0, 5)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                      <Users size={12} className="text-slate-400" /> {ev.batch === "All Batches" ? "Global" : ev.batch}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleDelete(ev.id)}
                                className="p-3 bg-white hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-xl border border-slate-100 hover:border-rose-100 transition-all shadow-sm"
                              >
                                <Trash2 size={16} />
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

      {/* Modern Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                    <Calendar size={20} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-900">Schedule Activity</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add curriculum to calendar</p>
                 </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 rounded-xl transition-all"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                
                <div className="col-span-2 space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Type</label>
                   <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 gap-1.5">
                      {(['class', 'test', 'assignment'] as const).map(type => {
                        const c = cfg(type);
                        const isSelected = formData.type === type;
                        return (
                          <button 
                            key={type} 
                            type="button" 
                            onClick={() => setFormData({...formData, type})}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isSelected ? `bg-white shadow-md ${c.text}` : 'text-slate-400 hover:text-slate-600'}`}
                          >
                             {c.icon} {c.label}
                          </button>
                        )
                      })}
                   </div>
                </div>

                <div className="col-span-2 space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Activity Title</label>
                   <div className="relative">
                      <Info size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        required
                        type="text" 
                        placeholder="Select from library or type here..."
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-blue-400 focus:bg-white transition-all text-sm"
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                   <input 
                    required
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-blue-400 transition-all text-sm"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Batch</label>
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
                          setFormData({
                            ...formData, 
                            batch: val,
                            start_time: to24(start),
                            end_time: to24(end)
                          });
                        } catch (e) {
                          setFormData({...formData, batch: val});
                        }
                      } else {
                        setFormData({...formData, batch: val});
                      }
                    }}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-blue-400 transition-all text-sm appearance-none cursor-pointer"
                   >
                     <option value="All Batches">All Batches</option>
                      {batchesList.map((b, i) => (
                        <option key={i} value={b.title}>{b.title}</option>
                      ))}
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</label>
                   <div className="relative">
                      <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="time" 
                        value={formData.start_time}
                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-blue-400 transition-all text-sm"
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</label>
                   <div className="relative">
                      <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="time" 
                        value={formData.end_time}
                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:border-blue-400 transition-all text-sm"
                      />
                   </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                 <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                 >
                    Cancel
                 </button>
                 <button 
                  disabled={loading}
                  className="flex-[2] py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2 active:scale-95"
                 >
                    {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight size={16} />}
                    Confirm Schedule
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
