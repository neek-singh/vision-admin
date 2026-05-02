"use client";

import { useState, useEffect } from "react";
import { 
  Calendar, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Save, 
  History, 
  BarChart3, 
  Search,
  Loader2,
  ChevronRight,
  Filter,
  Download
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AttendanceStatus = 'present' | 'absent' | 'late';

interface Student {
  id: string;
  name: string;
  student_id: string;
}

export default function AttendanceClient({ initialCourses }: { initialCourses: any[] }) {
  const [activeTab, setActiveTab] = useState<'mark' | 'history' | 'report'>('mark');
  const [selectedCourse, setSelectedCourse] = useState(initialCourses[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch students enrolled in the selected course
  useEffect(() => {
    if (selectedCourse && activeTab === 'mark') {
      fetchStudentsAndAttendance();
    }
  }, [selectedCourse, selectedDate, activeTab]);

  async function fetchStudentsAndAttendance() {
    setLoading(true);
    try {
      // 1. Fetch enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          students(id, name, student_id)
        `)
        .eq("course_id", selectedCourse);

      if (enrollError) throw enrollError;

      const studentList = enrollments?.map((e: any) => e.students).filter(Boolean) || [];
      setStudents(studentList);

      // 2. Fetch existing attendance for this date
      const { data: existingRecords, error: attendError } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("course_id", selectedCourse)
        .eq("date", selectedDate);

      if (attendError) throw attendError;

      // Initialize attendance state
      const initialAttend: Record<string, AttendanceStatus> = {};
      studentList.forEach((s: any) => {
        const record = existingRecords?.find(r => r.student_id === s.id);
        initialAttend[s.id] = record ? record.status : 'absent';
      });
      setAttendance(initialAttend);
    } catch (err: any) {
      console.error("Attendance Fetch Error:", err.message || err);
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAllAs = (status: AttendanceStatus) => {
    const newAttend: Record<string, AttendanceStatus> = {};
    students.forEach(s => newAttend[s.id] = status);
    setAttendance(newAttend);
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        course_id: selectedCourse,
        date: selectedDate,
        status: status,
        marked_by: user?.id
      }));

      // Delete existing for this date/course first to prevent duplicates
      await supabase
        .from("attendance")
        .delete()
        .eq("course_id", selectedCourse)
        .eq("date", selectedDate);

      const { error } = await supabase.from("attendance").insert(records);
      if (error) throw error;
      
      alert("Attendance saved successfully!");
    } catch (err: any) {
      console.error("Attendance Save Error:", err.message || err);
      alert(`Failed to save attendance: ${err.message || 'Check database connection'}`);
    } finally {
      setSaving(false);
    }
  }

  const stats = {
    present: Object.values(attendance).filter(s => s === 'present').length,
    absent: Object.values(attendance).filter(s => s === 'absent').length,
    late: Object.values(attendance).filter(s => s === 'late').length,
  };

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('mark')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'mark' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <CheckCircle2 size={16} /> Mark Attendance
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <History size={16} /> History
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'report' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <BarChart3 size={16} /> Monthly Report
        </button>
      </div>

      {activeTab === 'mark' && (
        <div className="space-y-6">
          {/* Controls & Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Course</label>
                  <select 
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
                  >
                    {initialCourses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Attendance Date</label>
                  <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => markAllAs('present')} className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">Mark All Present</button>
                <button onClick={() => markAllAs('absent')} className="flex-1 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all">Mark All Absent</button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center group">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <p className="text-2xl font-black text-slate-900">{students.length}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Students</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Present</span>
                 </div>
                 <span className="text-sm font-black text-emerald-600">{stats.present}</span>
               </div>
               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-rose-500" />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Absent</span>
                 </div>
                 <span className="text-sm font-black text-rose-600">{stats.absent}</span>
               </div>
               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-amber-500" />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Late</span>
                 </div>
                 <span className="text-sm font-black text-amber-600">{stats.late}</span>
               </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                    <th className="px-8 py-5">Student Information</th>
                    <th className="px-8 py-5">Student ID</th>
                    <th className="px-8 py-5 text-center">Status Marking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center">
                        <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={32} />
                        <p className="text-sm font-bold text-slate-400">Loading student list...</p>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold">
                        No students enrolled in this course.
                      </td>
                    </tr>
                  ) : students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                            {student.name[0]}
                          </div>
                          <p className="font-black text-slate-900 text-sm">{student.name}</p>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-xs font-bold text-slate-500">{student.student_id}</span>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => updateStatus(student.id, 'present')}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${attendance[student.id] === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                          >
                            Present
                          </button>
                          <button 
                            onClick={() => updateStatus(student.id, 'late')}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${attendance[student.id] === 'late' ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                          >
                            Late
                          </button>
                          <button 
                            onClick={() => updateStatus(student.id, 'absent')}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${attendance[student.id] === 'absent' ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
             <button 
               disabled={saving || students.length === 0}
               onClick={saveAttendance}
               className="px-10 py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-200 flex items-center gap-3 disabled:opacity-50"
             >
               {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
               Save Attendance Data
             </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center space-y-4">
           <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto">
              <History size={32} />
           </div>
           <h3 className="text-xl font-black text-slate-900">Attendance History</h3>
           <p className="text-slate-500 font-medium max-w-sm mx-auto">Select a date in the Mark Attendance tab to view or edit past records.</p>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center space-y-4">
           <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto">
              <BarChart3 size={32} />
           </div>
           <h3 className="text-xl font-black text-slate-900">Monthly Attendance Report</h3>
           <p className="text-slate-500 font-medium max-w-sm mx-auto">Analytics and performance reports will be available here soon.</p>
        </div>
      )}
    </div>
  );
}
