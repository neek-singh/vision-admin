"use client";

import { useState } from "react";
import { 
  Bell, 
  Send, 
  History, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  Filter,
  Trash2,
  Users,
  BookOpen,
  User,
  Loader2,
  Calendar
} from "lucide-react";
import { sendNotification, deleteNotification } from "@/app/actions/lms/notifications";

const NOTIFICATION_TYPES = [
  { value: "info", label: "Information", icon: <Info size={14}/>, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  { value: "success", label: "Success", icon: <CheckCircle size={14}/>, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  { value: "warning", label: "Warning", icon: <AlertTriangle size={14}/>, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  { value: "alert", label: "Urgent Alert", icon: <AlertCircle size={14}/>, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
];

export default function NotificationsClient({ 
  initialNotifications, 
  courses, 
  students,
  batches
}: { 
  initialNotifications: any[], 
  courses: any[], 
  students: any[],
  batches: string[]
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    target_type: "all",
    target_value: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await sendNotification(formData);
    
    if (result.success) {
      setFormData({
        title: "",
        message: "",
        type: "info",
        target_type: "all",
        target_value: ""
      });
      alert("Notification sent successfully!");
    } else {
      alert("Error: " + result.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notification history?")) return;
    const result = await deleteNotification(id);
    if (result.error) alert(result.error);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Create Notification Form */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5 h-fit sticky top-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
              <Bell size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-900">Send Update</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notification Title</label>
              <input 
                required
                type="text"
                placeholder="e.g. New Assignment Uploaded"
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-slate-700"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message</label>
              <textarea 
                required
                rows={3}
                placeholder="Write your message here..."
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-slate-700 text-sm"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {NOTIFICATION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      formData.type === type.value 
                      ? `${type.bg} ${type.color} ${type.border}` 
                      : "bg-white border-slate-100 text-slate-400"
                    }`}
                  >
                    {type.icon} {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Audience</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, target_type: "all", target_value: "" })}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${formData.target_type === "all" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500"}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, target_type: "course", target_value: "" })}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${formData.target_type === "course" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500"}`}
                >
                  Course
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, target_type: "batch", target_value: "" })}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${formData.target_type === "batch" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500"}`}
                >
                  Batch
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, target_type: "individual", target_value: "" })}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${formData.target_type === "individual" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500"}`}
                >
                  Student
                </button>
              </div>

              {formData.target_type === "batch" && (
                <select 
                  required
                  className="w-full px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs outline-none border border-indigo-100"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                >
                  <option value="">Select Batch...</option>
                  {batches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              )}

              {formData.target_type === "course" && (
                <select 
                  required
                  className="w-full px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs outline-none border border-indigo-100"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                >
                  <option value="">Select Course...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              )}

              {formData.target_type === "individual" && (
                <select 
                  required
                  className="w-full px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs outline-none border border-indigo-100"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                >
                  <option value="">Select Student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>)}
                </select>
              )}
            </div>

            <button 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Send Notification
            </button>
          </form>
        </div>

        {/* Notification History */}
        <div className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <History size={22} className="text-slate-400" /> Recent Notifications
            </h2>
          </div>

          <div className="space-y-4">
            {initialNotifications.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-[2rem] border border-slate-100 text-slate-400">
                <Bell size={40} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">No notifications sent yet.</p>
              </div>
            ) : (
              initialNotifications.map((notif) => {
                const typeInfo = NOTIFICATION_TYPES.find(t => t.value === notif.type) || NOTIFICATION_TYPES[0];
                return (
                  <div key={notif.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm group hover:shadow-md transition-all relative overflow-hidden">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${typeInfo.bg} ${typeInfo.color} rounded-2xl flex items-center justify-center shrink-0`}>
                        {typeInfo.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Calendar size={10} /> {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 leading-tight">{notif.title}</h4>
                        <p className="text-sm text-slate-500 font-medium line-clamp-2">{notif.message}</p>
                        
                        <div className="flex items-center gap-4 pt-3 mt-3 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-wider">
                              Target: {notif.target_type}
                            </div>
                            <div className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-wider">
                              Delivered: {notif.total_delivered}
                            </div>
                            <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-wider">
                              Read: {notif.read_count}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDelete(notif.id)}
                            className="ml-auto p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
