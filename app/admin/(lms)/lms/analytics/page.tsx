"use client";

import { useState } from "react";
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Wallet, 
  Award, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Filter,
  Download
} from "lucide-react";

export default function LMSAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  // Mock data for course popularity
  const coursesPopularity = [
    { title: "Full Stack Web Development", count: 85, color: "bg-blue-600", percent: "90%" },
    { title: "Basic Computer Course (BCC)", count: 64, color: "bg-indigo-600", percent: "75%" },
    { title: "Advanced Python Programming", count: 42, color: "bg-violet-650", percent: "55%" },
    { title: "Data Science & Machine Learning", count: 28, color: "bg-emerald-600", percent: "38%" },
    { title: "Tally ERP & GST Accountant", count: 20, color: "bg-amber-600", percent: "25%" },
  ];

  // Mock data for grades distribution
  const grades = [
    { grade: "Grade A (Excellent)", count: 24, percent: 35, color: "bg-emerald-500" },
    { grade: "Grade B (Good)", count: 32, percent: 46, color: "bg-blue-500" },
    { grade: "Grade C (Average)", count: 10, percent: 14, color: "bg-amber-500" },
    { grade: "Grade D (Needs Review)", count: 3, percent: 5, color: "bg-rose-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <TrendingUp size={24} className="text-blue-600" /> Academic & LMS Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track course enrolments, student attendance metrics, assessments, and financial milestones.
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1">
            <Filter size={14} className="text-slate-400" /> Filter
          </button>
          <button className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-1 shadow-sm">
            <Download size={14} /> Export PDF Report
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Active Students" 
          value="239" 
          change="+4.2%" 
          trend="up" 
          sub="Current trimester"
          icon={Users}
          color="text-blue-600 bg-blue-50 dark:bg-blue-950/20"
        />
        <KPICard 
          title="Daily Attendance Rate" 
          value="91.4%" 
          change="+1.8%" 
          trend="up" 
          sub="Last 30 days avg"
          icon={Calendar}
          color="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
        />
        <KPICard 
          title="Avg. Assessment Score" 
          value="74.2%" 
          change="+3.5%" 
          trend="up" 
          sub="Across all tests"
          icon={Award}
          color="text-violet-600 bg-violet-50 dark:bg-violet-950/20"
        />
        <KPICard 
          title="Fee Installment Status" 
          value="82.4%" 
          change="+6.7%" 
          trend="up" 
          sub="Collected on schedule"
          icon={Wallet}
          color="text-amber-500 bg-amber-50 dark:bg-amber-950/20"
        />
      </div>

      {/* Main Grid: Enrolments & Popularity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Enrolment Growth Trend</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Monthly registrations</p>
            </div>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
              Last 6 Months
            </span>
          </div>

          <div className="h-64 w-full flex items-end justify-between gap-4 pt-6 border-b border-slate-100 dark:border-slate-800/60 pb-1">
            {/* Bar 1 */}
            <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[45%] relative group hover:bg-blue-650/20 transition-all cursor-pointer">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">12 std</div>
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[85%]"></div>
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Jan</span>
            </div>
            {/* Bar 2 */}
            <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[65%] relative group hover:bg-blue-650/20 transition-all cursor-pointer">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">18 std</div>
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[90%]"></div>
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Feb</span>
            </div>
            {/* Bar 3 */}
            <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[55%] relative group hover:bg-blue-655/20 transition-all cursor-pointer">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">15 std</div>
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[80%]"></div>
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Mar</span>
            </div>
            {/* Bar 4 */}
            <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[85%] relative group hover:bg-blue-655/20 transition-all cursor-pointer">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">24 std</div>
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[95%]"></div>
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Apr</span>
            </div>
            {/* Bar 5 */}
            <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[70%] relative group hover:bg-blue-655/20 transition-all cursor-pointer">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">20 std</div>
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[88%]"></div>
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">May</span>
            </div>
            {/* Bar 6 */}
            <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div className="w-full bg-blue-600/10 dark:bg-blue-500/5 rounded-t-2xl h-[95%] relative group hover:bg-blue-655/20 transition-all cursor-pointer">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm">26 std</div>
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t-2xl h-[98%]"></div>
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Jun</span>
            </div>
          </div>
        </div>

        {/* Fees Collections Radial Status */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Financial Milestone</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Fees collection distribution</p>
          </div>

          <div className="flex justify-center items-center h-28 relative">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.8" className="dark:stroke-slate-800/40" />
              {/* Paid: 82% */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(16, 185, 129)" strokeWidth="3.8" strokeDasharray="82 18" strokeDashoffset="100" />
              {/* Pending: 13% */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(245, 158, 11)" strokeWidth="3.8" strokeDasharray="13 87" strokeDashoffset="18" />
              {/* Overdue: 5% */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="3.8" strokeDasharray="5 95" strokeDashoffset="5" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wide leading-none">Paid</span>
              <span className="text-lg font-black text-slate-850 dark:text-white mt-0.5">82%</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center font-bold">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Fully Paid</span>
              <span className="text-slate-800 dark:text-slate-200">₹4,25,000 (82%)</span>
            </div>
            <div className="flex justify-between items-center font-bold">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Pending Installments</span>
              <span className="text-slate-800 dark:text-slate-200">₹67,500 (13%)</span>
            </div>
            <div className="flex justify-between items-center font-bold">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500"></span> Overdue Defaulters</span>
              <span className="text-slate-800 dark:text-slate-200">₹26,000 (5%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Course Popularity & Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Popularity List */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Course Popularity Index</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Student Enrollment splits</p>
          </div>

          <div className="space-y-4">
            {coursesPopularity.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-baseline text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-350">{item.title}</span>
                  <span className="text-slate-850 dark:text-slate-200 text-[10px]">{item.count} students</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: item.percent }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assessment Grade Distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Test Grade Metrics</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Student success benchmarks</p>
          </div>

          <div className="h-32 flex items-end gap-3 justify-center pb-2 border-b border-slate-100 dark:border-slate-800/40">
            {grades.map((g, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black">{g.count} std</span>
                <div className={`w-full ${g.color} rounded-t-xl`} style={{ height: `${g.percent}%` }}></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-650 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Grade A: {grades[0].count} students ({grades[0].percent}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
              <span>Grade B: {grades[1].count} students ({grades[1].percent}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span>Grade C: {grades[2].count} students ({grades[2].percent}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <span>Grade D: {grades[3].count} students ({grades[3].percent}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component
function KPICard({ title, value, change, trend, sub, icon: Icon, color }: any) {
  const isUp = trend === "up";
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-start">
      <div className="space-y-1.5">
        <p className="text-[10px] font-black text-slate-405 dark:text-slate-500 uppercase tracking-widest">{title}</p>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h2>
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-0.5
            ${isUp 
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" 
              : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"}`}
          >
            {isUp ? <TrendingUp size={10} /> : <TrendingUp size={10} />}
            {change}
          </span>
          <span className="text-[9.5px] text-slate-450 dark:text-slate-500 font-bold">{sub}</span>
        </div>
      </div>
      <div className={`p-2.5 rounded-2xl ${color}`}>
        <Icon size={18} />
      </div>
    </div>
  );
}
