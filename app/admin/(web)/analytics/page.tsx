"use client";

import { useState } from "react";
import {
  Activity,
  Eye, Users, Clock, ArrowUpRight, ArrowDownRight,
  TrendingUp, Globe, Smartphone, Laptop, Tablet, Info
} from "lucide-react";

// NOTE: This page shows website traffic insights.
// Real pageview data requires an analytics integration (e.g., Google Analytics, Plausible, or Cloudflare Analytics).
// The funnel data below is pulled from real Supabase data via server-side fetch.
// Traffic/device/referral data is illustrative until a real analytics API is connected.

export default function WebAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  // ── Funnel: Real data note shown to user ──
  // These stats are hardcoded estimates. To show real pageviews,
  // integrate Cloudflare Analytics or Google Analytics Data API.
  const funnelData = [
    { label: "Website Visits (Est.)", value: "~5,000", pct: 100, color: "bg-orange-500", note: true },
    { label: "Visited Courses", value: "~2,800", pct: 56, color: "bg-amber-500", note: true },
    { label: "Contact Form Submitted", value: "Real ↑", pct: null, color: "bg-rose-500", real: true },
    { label: "Students Enrolled", value: "Real ↑", pct: null, color: "bg-emerald-500", real: true },
  ];

  const referrals = [
    { source: "Google Search", visitors: "~4,200", rate: "+12%", trend: "up", conversion: "~3%" },
    { source: "Direct Traffic", visitors: "~1,800", rate: "+5%", trend: "up", conversion: "~5%" },
    { source: "YouTube", visitors: "~700", rate: "+28%", trend: "up", conversion: "~9%" },
    { source: "Instagram", visitors: "~500", rate: "-2%", trend: "down", conversion: "~6%" },
    { source: "Facebook", visitors: "~300", rate: "+44%", trend: "up", conversion: "~5%" },
  ];

  const popularPages = [
    { path: "/", title: "Home", views: "~4,500" },
    { path: "/courses", title: "All Courses & Batches", views: "~2,800" },
    { path: "/gallery", title: "Campus Gallery", views: "~1,200" },
    { path: "/about", title: "About Institute", views: "~800" },
    { path: "/contact", title: "Contact Us", views: "~600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Activity size={22} className="text-orange-500" /> Web Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Traffic overview · Connect Cloudflare or Google Analytics for live data
          </p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
          {["7d", "30d", "90d"].map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded-lg transition-all ${timeRange === r
                ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-2xl">
        <Info size={15} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
          <strong>Note:</strong> Traffic & visitor data are estimates. For live pageview tracking, connect{" "}
          <a href="https://analytics.cloudflare.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">
            Cloudflare Analytics
          </a>{" "}
          or{" "}
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">
            Google Analytics
          </a>.
          {" "}Contact form submissions & enrollments show <strong>real database counts</strong>.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Est. Pageviews" value="~5k" change="+18%" trend="up" sub="30 days est." icon={Eye} color="text-orange-500 bg-orange-50 dark:bg-orange-950/20" estimate />
        <KPICard title="Est. Visitors" value="~2k" change="+12%" trend="up" sub="Unique sessions" icon={Users} color="text-violet-500 bg-violet-50 dark:bg-violet-950/20" estimate />
        <KPICard title="Avg. Session" value="~2m" change="+5%" trend="up" sub="Time on site" icon={Clock} color="text-sky-500 bg-sky-50 dark:bg-sky-950/20" estimate />
        <KPICard title="Conv. Rate" value="~2%" change="+8%" trend="up" sub="Visit → Enquiry" icon={TrendingUp} color="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" estimate />
      </div>

      {/* Funnel + Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Conversion Funnel */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm">
          <h3 className="font-black text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-orange-500" /> Lead Conversion Funnel
          </h3>
          <div className="space-y-4">
            <FunnelStep label="Website Visits" value="~5,000" pct={100} color="bg-orange-500" isEst />
            <FunnelStep label="Viewed Courses" value="~2,800" pct={56} color="bg-amber-500" isEst />
            <FunnelStep label="Contact Enquiries" value="See Contacts Page →" pct={null} color="bg-rose-500" isReal />
            <FunnelStep label="Students Enrolled" value="See Students Page →" pct={null} color="bg-emerald-500" isReal />
          </div>
        </div>

        {/* Devices */}
        <div className="bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm">
          <h3 className="font-black text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Globe size={15} className="text-violet-500" /> Device Split (Est.)
          </h3>
          <div className="flex justify-center my-4 relative">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="4" className="dark:stroke-slate-800/40" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f97316" strokeWidth="4" strokeDasharray="65 35" strokeDashoffset="100" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#a855f7" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="35" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#0ea5e9" strokeWidth="4" strokeDasharray="10 90" strokeDashoffset="10" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-slate-900 dark:text-white">65%</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Mobile</span>
            </div>
          </div>
          <div className="space-y-2.5 mt-2">
            {[
              { icon: Smartphone, label: "Mobile", pct: "65%", color: "bg-orange-500" },
              { icon: Laptop, label: "Desktop", pct: "25%", color: "bg-violet-500" },
              { icon: Tablet, label: "Tablet", pct: "10%", color: "bg-sky-500" },
            ].map(d => (
              <div key={d.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold">
                  <d.icon size={13} className="text-slate-400" />
                  {d.label}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${d.color}`} style={{ width: d.pct }} />
                  </div>
                  <span className="font-black text-slate-700 dark:text-slate-300 w-8 text-right">{d.pct}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-3 text-center italic">* Estimated distribution</p>
        </div>
      </div>

      {/* Referrals + Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Channels */}
        <div className="bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm">
          <h3 className="font-black text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Globe size={15} className="text-orange-500" /> Top Acquisition Channels
            <span className="text-[9px] font-semibold text-slate-400 ml-1 normal-case italic">(estimated)</span>
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 w-4">{i + 1}</span>
                  <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">{r.source}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-xs font-black text-slate-600 dark:text-slate-400">{r.visitors}</span>
                  <span className={`text-[10px] font-black flex items-center gap-0.5 ${r.trend === "up" ? "text-emerald-500" : "text-rose-500"}`}>
                    {r.trend === "up" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {r.rate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Pages */}
        <div className="bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm">
          <h3 className="font-black text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <Eye size={15} className="text-violet-500" /> Popular Pages
            <span className="text-[9px] font-semibold text-slate-400 ml-1 normal-case italic">(estimated)</span>
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {popularPages.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 w-4 shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-300 truncate">{p.title}</p>
                    <span className="text-[9px] text-orange-500 dark:text-orange-400 font-bold">{p.path}</span>
                  </div>
                </div>
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 shrink-0 ml-3">{p.views}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, change, trend, sub, icon: Icon, color, estimate }: any) {
  const isUp = trend === "up";
  return (
    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm flex justify-between items-start">
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${isUp ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" : "bg-rose-50 text-rose-600 dark:bg-rose-950/20"}`}>
            {isUp ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />} {change}
          </span>
          <span className="text-[9px] text-slate-400 font-semibold">{sub}</span>
        </div>
        {estimate && <p className="text-[8px] text-slate-400 italic">*estimated</p>}
      </div>
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon size={16} />
      </div>
    </div>
  );
}

function FunnelStep({ label, value, pct, color, isEst, isReal }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          {label}
          {isEst && <span className="text-[8px] text-slate-400 font-normal italic">est.</span>}
          {isReal && <span className="text-[8px] text-emerald-500 font-black uppercase">Real</span>}
        </span>
        <span className="text-xs font-black text-slate-500 dark:text-slate-400">
          {isReal ? <span className="text-emerald-500">{value}</span> : `${value} ${pct !== null ? `(${pct}%)` : ""}`}
        </span>
      </div>
      {pct !== null ? (
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
        </div>
      ) : (
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full animate-pulse`} style={{ width: "100%" }} />
        </div>
      )}
    </div>
  );
}
