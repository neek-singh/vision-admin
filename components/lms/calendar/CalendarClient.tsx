"use client";

import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Calendar as CalendarIcon, 
  Video, 
  Plus, 
  Trash2, 
  Loader2,
  X,
  Clock,
  Flag,
  FileText,
  Sparkles,
  Search,
  Filter
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: any; badgeCls: string; iconCls: string }> = {
  class: {
    label: "Live Class",
    icon: Video,
    badgeCls: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/40",
    iconCls: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50"
  },
  test: {
    label: "Online Test",
    icon: FileText,
    badgeCls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40",
    iconCls: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50"
  },
  holiday: {
    label: "Holiday",
    icon: Flag,
    badgeCls: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40",
    iconCls: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50"
  },
  event: {
    label: "Event",
    icon: Sparkles,
    badgeCls: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200/60 dark:border-violet-900/40",
    iconCls: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50"
  },
};

const labelCls = "block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5";
const inputCls = "w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-normal text-slate-900 dark:text-slate-100 outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors";

export default function CalendarClient({ courses, initialEvents }: { courses: any[], initialEvents: any[] }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    type: "class",
    location: "Online",
    course_id: ""
  });

  const filteredEvents = useMemo(() => {
    return initialEvents.filter((ev) => {
      const matchType = typeFilter === "all" || ev.type === typeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        ev.title?.toLowerCase().includes(q) ||
        (ev.courses?.title && ev.courses.title.toLowerCase().includes(q)) ||
        ev.location?.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [initialEvents, searchQuery, typeFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("events")
        .insert([{
          title: formData.title.trim(),
          description: formData.description?.trim() || null,
          event_date: formData.event_date,
          type: formData.type,
          location: formData.location || "Online",
          start_time: "00:00:00",
          end_time: null,
          course_id: null
        }]);

      if (error) {
        console.error("Supabase insert event error:", error);
        throw error;
      }

      setIsAdding(false);
      setFormData({ 
        title: "", 
        description: "", 
        event_date: "", 
        start_time: "", 
        end_time: "", 
        type: "holiday", 
        location: "Online", 
        course_id: "" 
      });
      router.refresh();
    } catch (err: any) {
      console.error("Error adding event:", err);
      alert(`Failed to add event: ${err?.message || "Please try again."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-1 items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
            <Filter size={12} className="text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-slate-100 font-medium outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Types</option>
              <option value="holiday" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Holidays</option>
              <option value="class" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Live Classes</option>
              <option value="test" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Tests</option>
              <option value="event" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Events</option>
            </select>
          </div>
        </div>

        <button 
          onClick={() => setIsAdding(true)}
          className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus size={14} />
          Schedule Event
        </button>
      </div>

      {/* Modal Dialog */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Schedule Event</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Add a class, exam, or academic holiday</p>
              </div>
              <button 
                onClick={() => setIsAdding(false)} 
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className={labelCls}>Event Title</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. First Day of Durga Puja Festivities"
                    value={formData.title} 
                    onChange={(e) => setFormData({...formData, title: e.target.value})} 
                    className={inputCls} 
                  />
                </div>

                <div>
                  <label className={labelCls}>Date</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.event_date} 
                    onChange={(e) => setFormData({...formData, event_date: e.target.value})} 
                    className={inputCls} 
                  />
                </div>

                <div>
                  <label className={labelCls}>Type</label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => setFormData({...formData, type: e.target.value})} 
                    className={`${inputCls} bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100`}
                  >
                    <option value="holiday" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Holiday</option>
                    <option value="class" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Live Class</option>
                    <option value="test" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Online Test</option>
                    <option value="event" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Special Event</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)} 
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting} 
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={13} /> : <CalendarIcon size={13} />}
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold tracking-wider border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                    <CalendarIcon size={28} className="mx-auto mb-2 opacity-30" />
                    {initialEvents.length === 0 ? "No events scheduled yet." : "No matching events found."}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  const typeCfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.event;
                  const Icon = typeCfg.icon;

                  return (
                    <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeCfg.iconCls}`}>
                            <Icon size={14} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100 text-xs">{event.title}</p>
                            {(event.courses as any)?.title && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {(event.courses as any).title}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                          <CalendarIcon size={12} className="text-slate-400" />
                          <span>{event.event_date}</span>
                        </div>
                        {event.start_time && event.start_time !== "00:00:00" && event.start_time !== "00:00" && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            <Clock size={11} />
                            <span>{event.start_time}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${typeCfg.badgeCls}`}>
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button 
                          onClick={() => handleDelete(event.id)} 
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer" 
                          title="Delete event"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
