"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  FileText, 
  Video, 
  PenTool, 
  MoreVertical, 
  Settings,
  Trash2,
  ExternalLink,
  ChevronRight,
  Loader2,
  X,
  Check
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DeleteButton from "@/components/admin/DeleteButton";

export default function CourseContentManagement() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal/Form states
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lessonForm, setLessonForm] = useState<{moduleId: string, show: boolean}>({ moduleId: "", show: false });
  const [newLesson, setNewLesson] = useState({ 
    title: "", 
    type: "video", 
    content_url: "",
    duration: "",
    is_free: false,
    order_index: 0
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchModulesAndLessons(selectedCourseId);
    }
  }, [selectedCourseId]);

  async function fetchCourses() {
    const { data } = await supabase.from("courses").select("id, title").order("title");
    if (data && data.length > 0) {
      setCourses(data);
      setSelectedCourseId(data[0].id);
    }
    setLoading(false);
  }

  async function fetchModulesAndLessons(courseId: string) {
    setLoading(true);
    const { data: modulesData } = await supabase
      .from("lms_modules")
      .select(`
        id,
        title,
        lessons(*)
      `)
      .eq("course_id", courseId)
      .order("order_index");
    
    setModules(modulesData || []);
    setLoading(false);
  }

  async function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newModuleTitle || !selectedCourseId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("lms_modules").insert({
        course_id: selectedCourseId,
        title: newModuleTitle,
        order_index: modules.length + 1
      });

      if (!error) {
        setNewModuleTitle("");
        setShowModuleForm(false);
        fetchModulesAndLessons(selectedCourseId);
      }
    } catch (err) {
      console.error("Error adding module:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!newLesson.title || !lessonForm.moduleId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("lessons").insert({
        module_id: lessonForm.moduleId,
        title: newLesson.title,
        type: newLesson.type,
        content_url: newLesson.content_url,
        duration: newLesson.duration || null,
        is_free: newLesson.is_free,
        order_index: newLesson.order_index
      });

      if (!error) {
        setNewLesson({ 
          title: "", 
          type: "video", 
          content_url: "",
          duration: "",
          is_free: false,
          order_index: 0
        });
        setLessonForm({ moduleId: "", show: false });
        fetchModulesAndLessons(selectedCourseId);
      }
    } catch (err) {
      console.error("Error adding lesson:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
            <Settings size={14} />
            LMS Content Engine
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Curriculum Builder</h1>
          <p className="text-slate-500 font-medium">Design and organize course modules for the student portal.</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <div className="px-4 py-2 flex items-center gap-3">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Managing Course:</span>
            <select 
              value={selectedCourseId} 
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-transparent text-sm font-black text-slate-900 outline-none cursor-pointer hover:text-blue-600 transition-colors"
            >
              {courses.map(course => (
                <option key={course.id} value={course.id} className="font-bold">{course.title}</option>
              ))}
            </select>
          </div>
          <div className="w-[1px] h-8 bg-slate-200" />
          <button 
            onClick={() => setShowModuleForm(true)}
            className="px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-xl shadow-slate-200 active:scale-95"
          >
             <Plus size={16} /> Add Module
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Module Sidebar Navigator */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden sticky top-24">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Module List</h3>
               <span className="px-2 py-0.5 bg-slate-200 text-[10px] font-black rounded-lg">{modules.length}</span>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {modules.map((module, index) => (
                <button 
                  key={module.id} 
                  onClick={() => document.getElementById(module.id)?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full text-left px-4 py-4 hover:bg-blue-50/50 rounded-2xl transition-all group flex items-start gap-3"
                >
                  <div className="w-6 h-6 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{module.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{module.lessons?.length || 0} Topics</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 bg-slate-50/30">
               <button 
                onClick={() => setShowModuleForm(true)}
                className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 hover:text-blue-600 transition-all rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2"
              >
                  <Plus size={14} /> New Section
               </button>
            </div>
          </div>
        </div>

        {/* Content Builder Area */}
        <div className="lg:col-span-9 space-y-12 pb-20">
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
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">Your Curriculum is Empty</h3>
                <p className="text-slate-500 font-medium max-w-sm mx-auto text-sm leading-relaxed">
                  Start creating the course structure by adding your first module. You can then add lessons and materials inside it.
                </p>
              </div>
              <button 
                onClick={() => setShowModuleForm(true)}
                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:-translate-y-1 transition-all"
              >
                Create First Module
              </button>
            </div>
          ) : (
            modules.map((module, mIndex) => (
              <div key={module.id} id={module.id} className="relative group scroll-mt-24">
                {/* Module Header Card */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden relative z-10">
                  <div className="px-10 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
                     <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg uppercase tracking-[0.2em]">Module {mIndex + 1}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{module.lessons?.length || 0} Lessons</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">{module.title}</h2>
                     </div>
                     <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setLessonForm({ moduleId: module.id, show: true })}
                          className="px-6 py-3 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-2"
                        >
                           <Plus size={16} /> Add Lesson
                        </button>
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer">
                           <DeleteButton id={module.id} table="lms_modules" title={module.title} onSuccess={() => fetchModulesAndLessons(selectedCourseId)} />
                        </div>
                     </div>
                  </div>

                  {/* Lessons List */}
                  <div className="p-6">
                    <div className="space-y-3">
                      {(module.lessons || []).length === 0 ? (
                        <div className="py-10 text-center border-2 border-dashed border-slate-50 rounded-3xl">
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No topics added to this module yet</p>
                        </div>
                      ) : (
                        module.lessons.map((lesson: any, lIndex: number) => (
                          <div key={lesson.id} className="group/lesson flex items-center gap-6 p-4 rounded-3xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                             <div className="w-12 h-12 shrink-0 rounded-2xl bg-white border border-slate-50 flex items-center justify-center text-slate-400 group-hover/lesson:scale-110 transition-transform shadow-sm">
                                {lesson.type === 'video' ? <Video size={20} className="text-blue-600" /> : <FileText size={20} className="text-amber-600" />}
                             </div>
                             <div className="flex-1">
                                <div className="flex items-center gap-3 mb-0.5">
                                   <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Part {lIndex + 1}</span>
                                   <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                     lesson.type === 'video' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                   }`}>
                                     {lesson.type}
                                   </span>
                                   {lesson.duration && (
                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        • {lesson.duration} mins
                                     </span>
                                   )}
                                   {lesson.is_free && (
                                     <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-100 text-[9px] font-black rounded-lg uppercase tracking-widest">
                                        Free Preview
                                     </span>
                                   )}
                                </div>
                                <h4 className="text-sm font-black text-slate-900 group-hover/lesson:text-blue-600 transition-colors">{lesson.title}</h4>
                             </div>
                             <div className="flex items-center gap-4 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                                <a href={lesson.content_url} target="_blank" className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                                   <ExternalLink size={16} />
                                </a>
                                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer shadow-sm">
                                   <DeleteButton id={lesson.id} table="lessons" title={lesson.title} onSuccess={() => fetchModulesAndLessons(selectedCourseId)} />
                                </div>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                {/* Decorative connecting line */}
                <div className="absolute left-1/2 -bottom-12 w-[2px] h-12 bg-slate-100 group-last:hidden" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals - Improved Visibility */}
      {showModuleForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">New Module</h3>
              <button onClick={() => setShowModuleForm(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={20} className="text-slate-900" /></button>
            </div>
            <form onSubmit={handleAddModule} className="p-8 space-y-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Module Title</label>
                <input 
                  autoFocus required type="text" value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="e.g. Fundamental Concepts" 
                  className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-lg placeholder:text-slate-300" 
                />
              </div>
              <button 
                disabled={isSubmitting}
                className="w-full py-5 bg-slate-900 hover:bg-blue-600 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                Create Module Section
              </button>
            </form>
          </div>
        </div>
      )}

      {lessonForm.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">Add Lesson Content</h3>
              <button onClick={() => setLessonForm({ moduleId: "", show: false })} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={20} className="text-slate-900" /></button>
            </div>
            <form onSubmit={handleAddLesson} className="p-8 space-y-8">
              <div className="space-y-2 group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Lesson Title</label>
                <input 
                  autoFocus required type="text" value={newLesson.title}
                  onChange={(e) => setNewLesson({...newLesson, title: e.target.value})}
                  placeholder="e.g. Getting Started with Tools" 
                  className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-lg placeholder:text-slate-300" 
                />
              </div>
              
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-focus-within:text-blue-600 transition-colors">Display Order</label>
                  <input 
                    type="number" value={newLesson.order_index}
                    onChange={(e) => setNewLesson({...newLesson, order_index: parseInt(e.target.value)})}
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-blue-600 outline-none transition-all font-black text-black text-sm" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-8">
                <label className="flex items-center gap-3 cursor-pointer group/check">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={newLesson.is_free}
                      onChange={(e) => setNewLesson({...newLesson, is_free: e.target.checked})}
                      className="peer sr-only"
                    />
                    <div className="w-12 h-6 bg-slate-200 rounded-full peer-checked:bg-blue-600 transition-all shadow-inner" />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-6 shadow-sm" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/check:text-slate-900">Allow Free Preview</span>
                </label>
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full py-5 bg-slate-900 hover:bg-blue-600 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-95"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                Add Content to Module
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
