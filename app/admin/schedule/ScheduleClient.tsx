"use client";

import { useState, useEffect } from "react";
import { 
  Calendar, 
  Plus, 
  Clock, 
  BookOpen, 
  FileText, 
  PenTool, 
  X, 
  CheckCircle2, 
  Trash2,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Filter,
  Users
} from "lucide-react";
import { createSchedule, deleteSchedule, getCurriculumTopics } from "@/app/actions/schedule";

export default function ScheduleClient({ 
  initialSchedules, 
  courses 
}: { 
  initialSchedules: any[], 
  courses: any[] 
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [curriculum, setCurriculum] = useState<{modules: any[], tests: any[], assignments: any[]}>({ modules: [], tests: [], assignments: [] });
  
  // Form State
  const [formData, setFormData] = useState({
    course_id: "",
    type: "class" as any,
    title: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    start_time: "09:00",
    end_time: "10:30",
    batch: "All Batches"
  });

  // Fetch topics when course changes
  useEffect(() => {
    if (formData.course_id) {
      getCurriculumTopics(formData.course_id).then(setCurriculum);
    } else {
      setCurriculum({ modules: [], tests: [], assignments: [] });
    }
  }, [formData.course_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createSchedule(formData);
    if (res.success) {
      setShowAdd(false);
      setFormData({ ...formData, title: "", description: "" });
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this event?")) return;
    await deleteSchedule(id);
  };

  const typeStyles: any = {
    class: "bg-indigo-50 text-indigo-600 border-indigo-100",
    test: "bg-rose-50 text-rose-600 border-rose-100",
    assignment: "bg-amber-50 text-amber-600 border-amber-100"
  };

  const typeIcons: any = {
    class: <BookOpen size={14} />,
    test: <FileText size={14} />,
    assignment: <PenTool size={14} />
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Academic Scheduler</h1>
          <p className="text-sm text-slate-500 font-medium">Plan your classes, tests, and student assignments.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all flex items-center gap-2 shadow-xl shadow-indigo-100"
        >
          <Plus size={18} /> Schedule Event
        </button>
      </div>

      {/* Schedule List */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          {initialSchedules.length === 0 ? (
            <div className="p-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
               <Calendar size={40} className="mx-auto mb-4 text-slate-200" />
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No events scheduled yet</p>
            </div>
          ) : (
            initialSchedules.map((item) => (
              <div key={item.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex items-center gap-6">
                <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 ${typeStyles[item.type]}`}>
                   <span className="text-[10px] font-black uppercase">{new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
                   <span className="text-xl font-black">{new Date(item.date).getDate()}</span>
                </div>

                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border flex items-center gap-1 ${typeStyles[item.type]}`}>
                         {typeIcons[item.type]} {item.type}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         {item.courses?.title} • {item.batch}
                      </span>
                   </div>
                   <h3 className="text-lg font-black text-slate-900 truncate">{item.title}</h3>
                   <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                         <Clock size={12} /> {item.start_time.slice(0,5)} - {item.end_time.slice(0,5)}
                      </div>
                      {item.description && (
                        <div className="text-[10px] font-bold text-slate-400 truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                   </div>
                </div>

                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Filter/Summary */}
        <div className="space-y-6">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Calendar size={80}/></div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Upcoming Classes</h4>
              <p className="text-4xl font-black tracking-tighter">{initialSchedules.filter(s => s.type === 'class').length}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase">This Week's Load</p>
           </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
             <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
               <h3 className="text-2xl font-black text-slate-900">Schedule New Event</h3>
               <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={24}/></button>
             </div>

             <form onSubmit={handleSubmit} className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                   {/* Course Selection */}
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Course</label>
                      <select 
                        required 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none font-bold text-sm transition-all"
                        value={formData.course_id}
                        onChange={(e) => setFormData({...formData, course_id: e.target.value})}
                      >
                        <option value="">Select Course...</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                   </div>

                   {/* Type Selection */}
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Type</label>
                      <div className="flex bg-slate-50 p-1 rounded-2xl gap-1">
                         {['class', 'test', 'assignment'].map(type => (
                           <button 
                            key={type} 
                            type="button"
                            onClick={() => setFormData({...formData, type: type as any})}
                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === type ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                           >
                             {type}
                           </button>
                         ))}
                      </div>
                   </div>

                   {/* Title Input - With Curriculum Selector */}
                   <div className="col-span-2 space-y-4">
                      <div className="flex items-center justify-between">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
                      </div>

                      {/* Curriculum Selector Dropdown */}
                      {(curriculum.modules.length > 0 || curriculum.tests.length > 0 || curriculum.assignments.length > 0) ? (
                        <div className="space-y-2">
                           <select 
                             className="w-full px-5 py-4 rounded-2xl bg-indigo-50 border-2 border-indigo-100 outline-none font-bold text-slate-700 transition-all focus:bg-white"
                             onChange={(e) => {
                               const val = e.target.value;
                               if (val) {
                                 setFormData({...formData, title: val, description: `Academic session on: ${val}`});
                               }
                             }}
                           >
                             <option value="">-- Pick from Curriculum/Tests/Assignments --</option>
                             
                             {curriculum.modules.length > 0 && (
                               <optgroup label="📖 Modules & Lessons">
                                 {curriculum.modules.map(mod => (
                                    mod.lessons?.map((lesson: any) => (
                                      <option key={lesson.id} value={`${mod.title}: ${lesson.title}`}>
                                        {mod.title}: {lesson.title}
                                      </option>
                                    ))
                                 ))}
                               </optgroup>
                             )}

                             {curriculum.tests.length > 0 && (
                               <optgroup label="📝 Unit Tests & Exams">
                                 {curriculum.tests.map(test => (
                                   <option key={test.id} value={`Test: ${test.title}`}>
                                     {test.title}
                                   </option>
                                 ))}
                               </optgroup>
                             )}

                             {curriculum.assignments.length > 0 && (
                               <optgroup label="📂 Assignments">
                                 {curriculum.assignments.map(ass => (
                                   <option key={ass.id} value={`Assignment: ${ass.title}`}>
                                     {ass.title}
                                   </option>
                                 ))}
                               </optgroup>
                             )}
                           </select>
                           <p className="text-[9px] font-medium text-slate-400 ml-2">Or type a custom title below if not listed ↓</p>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                           <p className="text-[10px] font-bold text-slate-400">Select a course to see curriculum & tests</p>
                        </div>
                      )}

                      <input 
                        required 
                        type="text" 
                        placeholder="Type event title here..."
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none font-black text-lg transition-all"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                      <input type="date" className="w-full px-5 py-3 rounded-2xl bg-slate-50 font-bold" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})}/>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start</label>
                        <input type="time" className="w-full px-5 py-3 rounded-2xl bg-slate-50 font-bold" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})}/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End</label>
                        <input type="time" className="w-full px-5 py-3 rounded-2xl bg-slate-50 font-bold" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})}/>
                      </div>
                   </div>
                </div>

                <button 
                  disabled={loading}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  {loading ? <span className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"/> : <Calendar size={24}/>}
                  Publish to Calendar
                </button>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}
