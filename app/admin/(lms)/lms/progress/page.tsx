"use client";

import { useState } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreHorizontal
} from "lucide-react";

export default function StudentProgressTracking() {
  const [searchTerm, setSearchTerm] = useState("");

  const students = [
    { id: "VIT2026STD001", name: "Amarjeet Kumar", course: "Basic Computer Course", progress: 85, lastActive: "10 mins ago", status: "On Track" },
    { id: "VIT2026STD002", name: "Neha Singh", course: "Web Development", progress: 45, lastActive: "2 hours ago", status: "Slow Progress" },
    { id: "VIT2026STD003", name: "Rahul Sharma", course: "Advanced Python", progress: 100, lastActive: "Yesterday", status: "Completed" },
    { id: "VIT2026STD004", name: "Sonia Verma", course: "Data Science", progress: 12, lastActive: "3 days ago", status: "At Risk" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Progress Tracking</h1>
          <p className="text-sm text-slate-500">Monitor engagement and completion rates across all modules.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-sm font-bold rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2">
             <Filter size={16} /> Filter By Course
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all">
             Export Report
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
           <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Completed Courses</p>
           <p className="text-3xl font-black text-emerald-700">124</p>
           <p className="text-xs text-emerald-600/70 font-bold mt-2">Students finished all modules</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
           <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Active Learners</p>
           <p className="text-3xl font-black text-blue-700">842</p>
           <p className="text-xs text-blue-600/70 font-bold mt-2">Active in the last 24 hours</p>
        </div>
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
           <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">At Risk Students</p>
           <p className="text-3xl font-black text-red-700">18</p>
           <p className="text-xs text-red-600/70 font-bold mt-2">No activity for over 7 days</p>
        </div>
      </div>

      {/* Main Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <h2 className="font-bold text-slate-900">Engagement Master List</h2>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by name or ID..." 
                className="pl-10 pr-4 py-2 bg-slate-50 border-transparent text-sm rounded-xl outline-none focus:bg-white focus:border-blue-500 w-full md:w-80 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest">Student Info</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest">Assigned Course</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest">Mastery Progress</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest">Health Status</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                     <div>
                        <p className="font-bold text-slate-900">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{student.id}</p>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                     <p className="font-bold text-slate-700">{student.course}</p>
                     <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={10} /> Active {student.lastActive}
                     </p>
                  </td>
                  <td className="px-6 py-4">
                     <div className="space-y-1">
                        <div className="flex justify-between items-center w-32">
                           <span className="text-[10px] font-bold text-blue-600">{student.progress}%</span>
                         </div>
                         <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                             className={`h-full transition-all duration-1000 ${student.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                             style={{ width: `${student.progress}%` }} 
                            />
                         </div>
                      </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                       student.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                       student.status === 'Slow Progress' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                       student.status === 'At Risk' ? 'bg-red-50 text-red-700 border-red-100' :
                       'bg-blue-50 text-blue-700 border-blue-100'
                     }`}>
                        {student.status === 'Completed' ? <CheckCircle2 size={10} /> : 
                         student.status === 'At Risk' ? <AlertCircle size={10} /> : <Clock size={10} />}
                        {student.status}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <ArrowUpRight size={18} />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
           <p className="text-xs text-slate-500 font-bold">Showing 4 of {students.length} students</p>
           <div className="flex gap-2">
              <button className="px-3 py-1 border border-slate-200 rounded text-xs font-bold disabled:opacity-50" disabled>Prev</button>
              <button className="px-3 py-1 border border-slate-200 rounded text-xs font-bold">Next</button>
           </div>
        </div>
      </div>
    </div>
  );
}
