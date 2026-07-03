"use client";

import { useState } from "react";
import { 
  Activity, 
  Eye, 
  Users, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Globe, 
  Smartphone, 
  Laptop, 
  Tablet,
  ChevronRight,
  Filter
} from "lucide-react";

export default function WebAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  // Mock data for top referral channels
  const referrals = [
    { source: "Google Search", visitors: 4850, rate: "+12.4%", trend: "up", conversion: "3.2%" },
    { source: "Direct Traffic", visitors: 2240, rate: "+5.1%", trend: "up", conversion: "4.8%" },
    { source: "YouTube Channel", visitors: 1840, rate: "+28.2%", trend: "up", conversion: "8.5%" },
    { source: "Instagram Profile", visitors: 1210, rate: "-2.4%", trend: "down", conversion: "6.1%" },
    { source: "Facebook Ads", visitors: 940, rate: "+44.0%", trend: "up", conversion: "5.5%" },
  ];

  // Mock data for popular visited pages
  const popularPages = [
    { path: "/", title: "Vision IT Home - Pratappur", views: 12500, time: "1m 45s", bounce: "38%" },
    { path: "/courses", title: "All Courses & Batches", views: 8200, time: "2m 10s", bounce: "29%" },
    { path: "/courses/web-dev", title: "Full Stack Web Development", views: 4800, time: "3m 15s", bounce: "22%" },
    { path: "/gallery", title: "Campus Gallery & Photos", views: 3100, time: "1m 20s", bounce: "45%" },
    { path: "/about", title: "About Our Institute", views: 1900, time: "1m 05s", bounce: "51%" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Activity size={24} className="text-orange-500" /> Website Traffic & Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Analyze visitor acquisition channels, conversion rates, and device distribution.
          </p>
        </div>
        
        {/* Time Selector */}
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1">
            <Filter size={14} className="text-slate-400" /> Filter
          </button>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
            {["7d", "30d", "90d"].map(r => (
              <button 
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all
                  ${timeRange === r 
                    ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: 4 Small KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Pageviews" 
          value="31,450" 
          change="+18.2%" 
          trend="up" 
          sub="Last 30 days"
          icon={Eye}
          color="text-orange-500 bg-orange-50 dark:bg-orange-950/20"
        />
        <KPICard 
          title="Unique Visitors" 
          value="11,040" 
          change="+12.4%" 
          trend="up" 
          sub="Last 30 days"
          icon={Users}
          color="text-amber-500 bg-amber-50 dark:bg-amber-950/20"
        />
        <KPICard 
          title="Avg. Session Time" 
          value="2m 18s" 
          change="-4.2%" 
          trend="down" 
          sub="Global engagement"
          icon={Clock}
          color="text-rose-500 bg-rose-50 dark:bg-rose-950/20"
        />
        <KPICard 
          title="Enquiry Conv. Rate" 
          value="5.62%" 
          change="+8.7%" 
          trend="up" 
          sub="Visitor to enquiry ratio"
          icon={TrendingUp}
          color="text-sky-500 bg-sky-50 dark:bg-sky-950/20"
        />
      </div>

      {/* Grid: Main Traffic Charts & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Line Chart Comparison */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Traffic Comparison Overview</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Pageviews vs Unique Visitors</p>
            </div>
            <div className="flex gap-4 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-orange-500 rounded-full"></span> Pageviews</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span> Visitors</span>
            </div>
          </div>

          <div className="h-64 w-full relative pt-2">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              {/* Horizontal Grid lines */}
              <line x1="0" y1="50" x2="500" y2="50" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800/20" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800/20" />
              <line x1="0" y1="150" x2="500" y2="150" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800/20" />

              {/* Line 1: Pageviews (Orange) */}
              <path 
                d="M 0 160 Q 100 120 200 135 T 400 60 Q 450 70 500 30" 
                fill="none" 
                stroke="rgb(249, 115, 22)" 
                strokeWidth="2.5" 
                strokeLinecap="round"
              />
              
              {/* Line 2: Unique Visitors (Amber) */}
              <path 
                d="M 0 180 Q 100 150 200 165 T 400 100 Q 450 110 500 80" 
                fill="none" 
                stroke="rgb(245, 158, 11)" 
                strokeWidth="2" 
                strokeDasharray="4,4"
                strokeLinecap="round"
              />

              {/* Hotspots */}
              <circle cx="200" cy="135" r="4.5" fill="rgb(249, 115, 22)" stroke="white" strokeWidth="1.5" className="animate-pulse" />
              <circle cx="400" cy="60" r="4.5" fill="rgb(249, 115, 22)" stroke="white" strokeWidth="1.5" className="animate-pulse" />
              <circle cx="500" cy="30" r="4.5" fill="rgb(249, 115, 22)" stroke="white" strokeWidth="1.5" className="animate-pulse" />
            </svg>
            
            <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold pt-3 border-t border-slate-100 dark:border-slate-800/50">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
            </div>
          </div>
        </div>

        {/* Lead Conversion Funnel */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Lead Conversion Funnel</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Traffic to Student pipeline</p>
          </div>

          <div className="space-y-4 py-4">
            <FunnelStep label="Website Visits" value="11,040" percentage={100} color="bg-orange-500" />
            <FunnelStep label="Visited Courses" value="6,820" percentage={61} color="bg-amber-500" />
            <FunnelStep label="Contact Form Submission" value="620" percentage={5.6} color="bg-rose-500" />
            <FunnelStep label="Actual Registrations" value="84" percentage={0.76} color="bg-emerald-500" />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed border border-slate-100 dark:border-slate-800/40 text-center">
            Overall Web Conversion rate: <span className="text-emerald-500 font-black">0.76%</span> from visit to admission.
          </div>
        </div>
      </div>

      {/* Grid: Demographics, Devices & Referrals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Splits */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Device Diagnostics</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Demographics break-down</p>
          </div>

          <div className="flex justify-center items-center h-28 relative">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="4.2" className="dark:stroke-slate-800/40" />
              {/* Mobile: 65% */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(249, 115, 22)" strokeWidth="4.2" strokeDasharray="65 35" strokeDashoffset="100" />
              {/* Desktop: 25% */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(245, 158, 11)" strokeWidth="4.2" strokeDasharray="25 75" strokeDashoffset="35" />
              {/* Tablet: 10% */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(14, 165, 233)" strokeWidth="4.2" strokeDasharray="10 90" strokeDashoffset="10" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-slate-850 dark:text-white">65%</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">Mobile</span>
            </div>
          </div>

          <div className="space-y-2">
            <DeviceRow icon={Smartphone} label="Mobile" percent="65%" count="7,176 visits" color="bg-orange-500" />
            <DeviceRow icon={Laptop} label="Desktop" percent="25%" count="2,760 visits" color="bg-amber-500" />
            <DeviceRow icon={Tablet} label="Tablet" percent="10%" count="1,104 visits" color="bg-sky-500" />
          </div>
        </div>

        {/* Top Referral Channels */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Top Acquisition Channels</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Referrals & Ad Channels</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold">
                <tr>
                  <th className="px-3 py-2 rounded-l-xl uppercase tracking-wider text-[9px]">Source</th>
                  <th className="px-3 py-2 uppercase tracking-wider text-[9px] text-right">Visitors</th>
                  <th className="px-3 py-2 uppercase tracking-wider text-[9px] text-right">Conv. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {referrals.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-3 py-3.5 font-bold text-slate-700 dark:text-slate-300">{item.source}</td>
                    <td className="px-3 py-3.5 text-right font-semibold">
                      <p className="text-slate-800 dark:text-slate-200">{item.visitors.toLocaleString()}</p>
                      <span className={`text-[9px] font-bold flex items-center justify-end gap-0.5 ${item.trend === "up" ? "text-emerald-500" : "text-rose-500"}`}>
                        {item.trend === "up" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {item.rate}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right text-emerald-500 dark:text-emerald-400 font-black">{item.conversion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Popular Visited Pages */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Page Engagement</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">Most viewed paths</p>
          </div>

          <div className="space-y-3">
            {popularPages.map((page, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-850/60 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-800/45 transition-all border border-slate-100/30 dark:border-slate-800/40">
                <div className="min-w-0 pr-4">
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{page.title}</p>
                  <span className="text-[9px] text-orange-600 dark:text-orange-400 font-black tracking-wide">{page.path}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-xs text-slate-850 dark:text-slate-100">{page.views.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Avg: {page.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function KPICard({ title, value, change, trend, sub, icon: Icon, color }: any) {
  const isUp = trend === "up";
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-start">
      <div className="space-y-1.5">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</p>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h2>
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-0.5
            ${isUp 
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" 
              : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"}`}
          >
            {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
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

function FunnelStep({ label, value, percentage, color }: any) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-350">
        <span>{label}</span>
        <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold">{value} ({percentage}%)</span>
      </div>
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function DeviceRow({ icon: Icon, label, percent, count, color }: any) {
  return (
    <div className="flex justify-between items-center text-xs">
      <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
        <Icon size={16} className="text-slate-400" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-3 font-semibold text-right">
        <span className="text-slate-400 dark:text-slate-550 text-[10px]">{count}</span>
        <span className="w-10 text-slate-800 dark:text-slate-100 font-black">{percent}</span>
        <span className={`w-2 h-2 rounded-full ${color}`}></span>
      </div>
    </div>
  );
}
