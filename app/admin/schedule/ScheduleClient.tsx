"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, Clock, BookOpen, FileText, PenTool, X, Trash2, ChevronRight, ChevronLeft, LayoutGrid, List, Filter, Users, MapPin, Sparkles } from "lucide-react";
import { createSchedule, deleteSchedule, getCurriculumTopics } from "@/app/actions/schedule";

const TYPE_CFG: Record<string,{bg:string,text:string,border:string,icon:any,label:string}> = {
  class:{bg:"bg-indigo-50",text:"text-indigo-600",border:"border-indigo-100",icon:<BookOpen size={14}/>,label:"Class"},
  test:{bg:"bg-rose-50",text:"text-rose-600",border:"border-rose-100",icon:<FileText size={14}/>,label:"Test"},
  assignment:{bg:"bg-amber-50",text:"text-amber-600",border:"border-amber-100",icon:<PenTool size={14}/>,label:"Assignment"},
};
function cfg(t:string){return TYPE_CFG[t]||TYPE_CFG.class;}

function getWeekDates(base:Date){
  const d=new Date(base);d.setDate(d.getDate()-d.getDay()+1);
  return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return x;});
}
function fmt(d:Date){return d.toISOString().split('T')[0];}
function dayLabel(d:Date){return d.toLocaleDateString('en-US',{weekday:'short'});}
function dateLabel(d:Date){return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});}

export default function ScheduleClient({initialSchedules,courses,batches,batchesList=[]}:{initialSchedules:any[],courses:any[],batches:string[],batchesList?:any[]}){
  const router = useRouter();
  const today=new Date();
  const [weekBase,setWeekBase]=useState(today);
  const [view,setView]=useState<'grid'|'list'>('grid');
  const [filterCourse,setFilterCourse]=useState('');
  const [filterBatch,setFilterBatch]=useState('');
  const [showAdd,setShowAdd]=useState(false);
  const [loading,setLoading]=useState(false);
  const [prefillDate,setPrefillDate]=useState('');
  const [curriculum,setCurriculum]=useState<{modules:any[],tests:any[],assignments:any[]}>({modules:[],tests:[],assignments:[]});
  const [formData,setFormData]=useState({course_id:"",type:"class" as any,title:"",description:"",date:fmt(today),start_time:"09:00",end_time:"10:30",batch:"All Batches"});

  const weekDates=useMemo(()=>getWeekDates(weekBase),[weekBase]);
  const weekStart=weekDates[0];const weekEnd=weekDates[6];

  const filtered=useMemo(()=>{
    let s=initialSchedules;
    if(filterCourse)s=s.filter(x=>x.course_id===filterCourse);
    if(filterBatch)s=s.filter(x=>x.batch===filterBatch);
    return s;
  },[initialSchedules,filterCourse,filterBatch]);

  const weekSchedules=useMemo(()=>{
    const start=fmt(weekStart),end=fmt(weekEnd);
    return filtered.filter(s=>s.date>=start&&s.date<=end);
  },[filtered,weekStart,weekEnd]);

  useEffect(()=>{
    if(formData.course_id)getCurriculumTopics(formData.course_id).then(setCurriculum);
    else setCurriculum({modules:[],tests:[],assignments:[]});
  },[formData.course_id]);

  const prevWeek=()=>{const d=new Date(weekBase);d.setDate(d.getDate()-7);setWeekBase(d);};
  const nextWeek=()=>{const d=new Date(weekBase);d.setDate(d.getDate()+7);setWeekBase(d);};
  const goToday=()=>setWeekBase(today);

  const openAddForDate=(date:string)=>{setPrefillDate(date);setFormData({...formData,date});setShowAdd(true);};

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();setLoading(true);
    const res=await createSchedule(formData);
    if(res.success){
      setShowAdd(false);
      setFormData({...formData,title:"",description:""});
      router.refresh();
    }
    else alert(res.error);
    setLoading(false);
  };
  const handleDelete=async(id:string)=>{
    if(!confirm("Remove this event?"))return;
    await deleteSchedule(id);
    router.refresh();
  };

  // Stats
  const classCount=weekSchedules.filter(s=>s.type==='class').length;
  const testCount=weekSchedules.filter(s=>s.type==='test').length;
  const assignCount=weekSchedules.filter(s=>s.type==='assignment').length;

  // Compute available items
  const alreadyScheduledTitles = useMemo(() => {
    return initialSchedules
      .filter(s => s.course_id === formData.course_id && s.batch === formData.batch)
      .map(s => s.title);
  }, [initialSchedules, formData.course_id, formData.batch]);

  const availableModules = useMemo(() => {
    return curriculum.modules.map(mod => ({
      ...mod,
      lessons: mod.lessons?.filter((l: any) => !alreadyScheduledTitles.includes(`${mod.title}: ${l.title}`))
    })).filter(mod => mod.lessons && mod.lessons.length > 0);
  }, [curriculum.modules, alreadyScheduledTitles]);

  const availableTests = useMemo(() => {
    return curriculum.tests.filter(t => !alreadyScheduledTitles.includes(`Test: ${t.title}`));
  }, [curriculum.tests, alreadyScheduledTitles]);

  const availableAssignments = useMemo(() => {
    return curriculum.assignments.filter(a => !alreadyScheduledTitles.includes(`Assignment: ${a.title}`));
  }, [curriculum.assignments, alreadyScheduledTitles]);

  // Group by date for list view
  const grouped=useMemo(()=>{
    const g:Record<string,any[]>={};
    filtered.forEach(s=>{if(!g[s.date])g[s.date]=[];g[s.date].push(s);});
    return Object.entries(g).sort(([a],[b])=>a.localeCompare(b));
  },[filtered]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Academic Scheduler</h1>
          <p className="text-sm text-slate-500 font-medium">Plan classes, tests & assignments by course and batch.</p>
        </div>
        <button onClick={()=>setShowAdd(true)} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95">
          <Plus size={16}/> Schedule Event
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 text-slate-400"><Filter size={14}/><span className="text-[10px] font-black uppercase tracking-widest">Filters</span></div>
        <select className="px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100 outline-none" value={filterCourse} onChange={e=>setFilterCourse(e.target.value)}>
          <option value="">All Courses</option>
          {courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select className="px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold border border-slate-100 outline-none" value={filterBatch} onChange={e=>setFilterBatch(e.target.value)}>
          <option value="">All Batches</option>
          {batches.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-100">
            <button onClick={()=>setView('grid')} className={`p-2 rounded-md transition-all ${view==='grid'?'bg-white shadow-sm text-indigo-600':'text-slate-400'}`}><LayoutGrid size={14}/></button>
            <button onClick={()=>setView('list')} className={`p-2 rounded-md transition-all ${view==='list'?'bg-white shadow-sm text-indigo-600':'text-slate-400'}`}><List size={14}/></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          {view==='grid'?(
            /* WEEK GRID VIEW */
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Week Nav */}
              <div className="p-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <button onClick={prevWeek} className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-500"><ChevronLeft size={16}/></button>
                  <h2 className="text-sm font-black text-slate-900">{dateLabel(weekStart)} — {dateLabel(weekEnd)}, {weekEnd.getFullYear()}</h2>
                  <button onClick={nextWeek} className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-500"><ChevronRight size={16}/></button>
                </div>
                <button onClick={goToday} className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 uppercase tracking-widest hover:bg-indigo-100 transition-colors">Today</button>
              </div>
              {/* Grid Header */}
              <div className="grid grid-cols-7 border-b border-slate-100">
                {weekDates.map((d,i)=>{const isToday=fmt(d)===fmt(today);return(
                  <div key={i} className={`py-3 text-center border-r border-slate-50 last:border-r-0 ${isToday?'bg-indigo-50/50':''}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dayLabel(d)}</p>
                    <p className={`text-lg font-black mt-0.5 ${isToday?'text-indigo-600':'text-slate-900'}`}>{d.getDate()}</p>
                  </div>
                );})}
              </div>
              {/* Grid Body */}
              <div className="grid grid-cols-7 min-h-[400px]">
                {weekDates.map((d,i)=>{
                  const dateStr=fmt(d);const isToday=dateStr===fmt(today);
                  const dayEvents=weekSchedules.filter(s=>s.date===dateStr).sort((a:any,b:any)=>(a.start_time||'').localeCompare(b.start_time||''));
                  return(
                    <div key={i} onClick={()=>openAddForDate(dateStr)} className={`border-r border-slate-50 last:border-r-0 p-2 cursor-pointer hover:bg-slate-50/50 transition-colors ${isToday?'bg-indigo-50/20':''}`}>
                      <div className="space-y-2">
                        {dayEvents.map((ev:any)=>{const c=cfg(ev.type);return(
                          <div key={ev.id} onClick={e=>e.stopPropagation()} className={`p-2 rounded-lg ${c.bg} border ${c.border} group relative`}>
                            <div className="flex items-center gap-1 mb-1">{c.icon}<span className={`text-[8px] font-black uppercase tracking-widest ${c.text}`}>{c.label}</span></div>
                            <p className="text-[11px] font-bold text-slate-900 leading-tight truncate">{ev.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5"><Clock size={9}/>{ev.start_time?.slice(0,5)}</span>
                              {ev.batch&&ev.batch!=='All Batches'&&<span className="text-[8px] font-black text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">{ev.batch}</span>}
                            </div>
                            <button onClick={()=>handleDelete(ev.id)} className="absolute top-1 right-1 p-1 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all rounded"><Trash2 size={11}/></button>
                          </div>
                        );})}
                        {dayEvents.length===0&&(
                          <div className="flex items-center justify-center h-16 text-slate-200 hover:text-indigo-400 transition-colors"><Plus size={16}/></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ):(
            /* LIST VIEW */
            <div className="space-y-4">
              {grouped.length===0?(
                <div className="p-16 text-center bg-white rounded-xl border-2 border-dashed border-slate-100">
                  <Calendar size={32} className="mx-auto mb-3 text-slate-200"/>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No events scheduled</p>
                </div>
              ):grouped.map(([date,events])=>(
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className={`w-2 h-2 rounded-full ${date===fmt(today)?'bg-indigo-600':'bg-slate-300'}`}/>
                    <span className="text-xs font-black text-slate-900">{new Date(date+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</span>
                    {date===fmt(today)&&<span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest">Today</span>}
                  </div>
                  <div className="space-y-2">
                    {events.map((ev:any)=>{const c=cfg(ev.type);return(
                      <div key={ev.id} className="group bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${c.bg} ${c.text} border ${c.border}`}>
                          {c.icon}
                          <span className="text-[7px] font-black uppercase mt-0.5">{c.label}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{ev.courses?.title} {ev.batch&&ev.batch!=='All Batches'?`• ${ev.batch}`:''}</span>
                          </div>
                            <h3 className="text-sm font-black text-slate-900 truncate">{ev.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={10}/>{ev.start_time?.slice(0,5)} - {ev.end_time?.slice(0,5)}</span>
                            </div>
                        </div>
                        <button onClick={()=>handleDelete(ev.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                      </div>
                    );})}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10"><Calendar size={60}/></div>
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">This Week</p>
            <p className="text-3xl font-black">{weekSchedules.length}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">Scheduled Events</p>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-white/10 rounded-lg p-2 text-center"><p className="text-lg font-black">{classCount}</p><p className="text-[7px] font-black uppercase tracking-widest text-indigo-300">Classes</p></div>
              <div className="bg-white/10 rounded-lg p-2 text-center"><p className="text-lg font-black">{testCount}</p><p className="text-[7px] font-black uppercase tracking-widest text-rose-300">Tests</p></div>
              <div className="bg-white/10 rounded-lg p-2 text-center"><p className="text-lg font-black">{assignCount}</p><p className="text-[7px] font-black uppercase tracking-widest text-amber-300">Tasks</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Quick Add</p>
            {weekDates.slice(0,5).map((d,i)=>(
              <button key={i} onClick={()=>openAddForDate(fmt(d))} className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-indigo-50 transition-colors text-left group border border-transparent hover:border-indigo-100">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${fmt(d)===fmt(today)?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600'}`}>{d.getDate()}</span>
                  <span className="text-xs font-bold text-slate-700">{dayLabel(d)}</span>
                </div>
                <Plus size={12} className="text-slate-300 group-hover:text-indigo-600 transition-colors"/>
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">All Events</p>
            <p className="text-2xl font-black text-slate-900">{filtered.length}</p>
            <p className="text-[10px] font-bold text-slate-400">Total scheduled</p>
          </div>
          {batchesList.length>0&&(
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Current Batches</p>
              <div className="space-y-2">
                {batchesList.map((b:any,i:number)=>(
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Users size={14}/></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black text-slate-900 truncate">{b.course}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400">{b.time}</span>
                        <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase">{b.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAdd&&(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <h3 className="text-lg font-black text-slate-900">Schedule New Event</h3>
              <button onClick={()=>setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Course</label>
                  <select required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none font-bold text-sm transition-all" value={formData.course_id} onChange={e=>setFormData({...formData,course_id:e.target.value})}>
                    <option value="">Select Course...</option>
                    {courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Batch</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none font-bold text-sm transition-all" 
                    value={formData.batch} 
                    onChange={e=>{
                      const val = e.target.value;
                      const selectedBatch = batchesList.find(b => `${b.course} (${b.type})` === val);
                      if (selectedBatch && selectedBatch.time) {
                        try {
                          const [start, end] = selectedBatch.time.split(' - ');
                          const to24 = (t: string) => {
                            const [time, mod] = t.trim().split(' ');
                            let [h, m] = time.split(':');
                            if (h === '12') h = '00';
                            if (mod === 'PM') h = String(parseInt(h) + 12);
                            return `${h.padStart(2, '0')}:${m}`;
                          };
                          setFormData({
                            ...formData, 
                            batch: val,
                            start_time: to24(start),
                            end_time: to24(end)
                          });
                        } catch (err) {
                          setFormData({...formData, batch: val});
                        }
                      } else {
                        setFormData({...formData, batch: val});
                      }
                    }}
                  >
                    <option value="All Batches">All Batches</option>
                    {batchesList.map((b: any, idx: number) => (
                      <option key={idx} value={`${b.course} (${b.type})`}>{b.course} - {b.type}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Event Type</label>
                  <div className="flex bg-slate-50 p-1 rounded-xl gap-1 border border-slate-200">
                    {(['class','test','assignment'] as const).map(type=>{const c=cfg(type);return(
                      <button key={type} type="button" onClick={()=>setFormData({...formData,type})} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${formData.type===type?`bg-white shadow-sm ${c.text}`:'text-slate-400 hover:text-slate-600'}`}>
                        {c.icon}{c.label}
                      </button>
                    );})}
                  </div>
                </div>
                <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Title</label>
                  {!formData.course_id ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center"><p className="text-[10px] font-bold text-slate-400">Select a course to see curriculum</p></div>
                  ) : (
                    <div className="space-y-2">
                      {formData.type === 'class' && (
                        availableModules.length > 0 ? (
                          <select required className="w-full px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 outline-none font-bold text-sm text-slate-700 transition-all focus:bg-white" value={formData.title} onChange={e=>{setFormData({...formData,title:e.target.value,description:`Academic session on: ${e.target.value}`});}}>
                            <option value="">-- Select a Lesson --</option>
                            {availableModules.map(mod=>mod.lessons?.map((l:any)=><option key={l.id} value={`${mod.title}: ${l.title}`}>{mod.title}: {l.title}</option>))}
                          </select>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center"><p className="text-[10px] font-bold text-slate-400">No lessons available (or all scheduled)</p></div>
                        )
                      )}
                      
                      {formData.type === 'test' && (
                        availableTests.length > 0 ? (
                          <select required className="w-full px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 outline-none font-bold text-sm text-slate-700 transition-all focus:bg-white" value={formData.title} onChange={e=>{setFormData({...formData,title:e.target.value,description:`Test: ${e.target.value}`});}}>
                            <option value="">-- Select a Test --</option>
                            {availableTests.map(t=><option key={t.id} value={`Test: ${t.title}`}>{t.title}</option>)}
                          </select>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center"><p className="text-[10px] font-bold text-slate-400">No tests available (or all scheduled)</p></div>
                        )
                      )}

                      {formData.type === 'assignment' && (
                        availableAssignments.length > 0 ? (
                          <select required className="w-full px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 outline-none font-bold text-sm text-slate-700 transition-all focus:bg-white" value={formData.title} onChange={e=>{setFormData({...formData,title:e.target.value,description:`Assignment: ${e.target.value}`});}}>
                            <option value="">-- Select an Assignment --</option>
                            {availableAssignments.map(a=><option key={a.id} value={`Assignment: ${a.title}`}>{a.title}</option>)}
                          </select>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center"><p className="text-[10px] font-bold text-slate-400">No assignments available (or all scheduled)</p></div>
                        )
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Date</label>
                  <input type="date" required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm" value={formData.date} onChange={e=>setFormData({...formData,date:e.target.value})}/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Start Time</label>
                  <input type="time" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm" value={formData.start_time} onChange={e=>setFormData({...formData,start_time:e.target.value})}/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">End Time</label>
                  <input type="time" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm" value={formData.end_time} onChange={e=>setFormData({...formData,end_time:e.target.value})}/>
                </div>
              </div>
              <button disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                {loading?<span className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"/>:<Calendar size={18}/>}
                Publish to Calendar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
