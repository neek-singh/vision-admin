'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  WifiOff,
  RefreshCw,
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  BookOpen,
  QrCode,
  CheckCircle2,
  HardDrive,
  Activity,
  ArrowRight,
} from 'lucide-react';

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-[90vh] flex-col items-center justify-center p-4 sm:p-8 text-center text-slate-100">
      {/* Offline Status Badge */}
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-6 shadow-xl shadow-amber-500/5">
        <WifiOff className="h-10 w-10 animate-pulse" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
        Offline Mode Active
      </h1>
      <p className="mt-3 max-w-lg text-sm sm:text-base text-slate-400 leading-relaxed">
        Vision Admin is operating without an active internet connection. All previously cached student records, attendance sheets, and schedule planners remain accessible.
      </p>

      {/* System Diagnostics Card */}
      <div className="mt-6 w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Activity className="h-4 w-4 text-blue-400" />
          <span>Local System Diagnostics</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
            <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-slate-400 text-[10px]">Network Status</p>
              <p className="font-medium text-amber-300">Disconnected</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
            <HardDrive className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-slate-400 text-[10px]">Cache Storage</p>
              <p className="font-medium text-emerald-300">Ready & Primed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cached Sections Navigation Grid */}
      <div className="mt-8 w-full max-w-lg text-left">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Available Cached Sections
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/dashboard"
            className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 hover:border-blue-500/40 hover:bg-slate-850 transition-all shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                  Dashboard
                </p>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Overview & stats</p>
            </div>
          </Link>

          <Link
            href="/students"
            className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 hover:border-emerald-500/40 hover:bg-slate-850 transition-all shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  Students
                </p>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Cached directory</p>
            </div>
          </Link>

          <Link
            href="/schedule"
            className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 hover:border-purple-500/40 hover:bg-slate-850 transition-all shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                  Schedule
                </p>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Batch timetables</p>
            </div>
          </Link>

          <Link
            href="/fees"
            className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 hover:border-amber-500/40 hover:bg-slate-850 transition-all shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                  Fee Counter
                </p>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Balances & receipts</p>
            </div>
          </Link>

          <Link
            href="/lms/attendance"
            className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 hover:border-cyan-500/40 hover:bg-slate-850 transition-all shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                  Attendance
                </p>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">QR scanner check-in</p>
            </div>
          </Link>

          <Link
            href="/student/dashboard"
            className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 hover:border-pink-500/40 hover:bg-slate-850 transition-all shadow-sm"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400 group-hover:bg-pink-500/20 transition-colors">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white group-hover:text-pink-300 transition-colors">
                  Vision Learn
                </p>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Offline study notes</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Checking Network...' : 'Retry Connection'}
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-1.5 text-xs text-slate-500">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        <span>Any data recorded offline will automatically synchronize when network is restored.</span>
      </div>
    </div>
  );
}
