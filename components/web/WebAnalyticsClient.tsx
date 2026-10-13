"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  MessageSquare,
  FileText,
  IndianRupee,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Banknote,
  CheckCircle2,
  Calendar,
  ExternalLink,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";

export type StudentItem = {
  id: string;
  name: string;
  student_id?: string;
  course: string | null;
  batch: string | null;
  status: string | null;
  admission_date: string | null;
  created_at: string;
};

export type ContactItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  created_at: string;
};

export type AdmissionItem = {
  id: string;
  student_name: string;
  course_id: string | null;
  status: string | null;
  created_at: string;
};

export type PaymentItem = {
  id: string;
  amount: number;
  payment_date: string | null;
  payment_mode: string | null;
  created_at: string;
};

export type BlogItem = {
  id: string;
  title: string;
  slug: string;
  category: string;
  views: number;
  published_at: string;
};

interface WebAnalyticsClientProps {
  students: StudentItem[];
  contacts: ContactItem[];
  admissions: AdmissionItem[];
  payments: PaymentItem[];
  blogs: BlogItem[];
  coursesCount: number;
  batchesCount: number;
}

type TimeRange = "7d" | "30d" | "90d" | "all";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function WebAnalyticsClient({
  students,
  contacts,
  admissions,
  payments,
  blogs,
  coursesCount,
  batchesCount,
}: WebAnalyticsClientProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter items based on selected time window
  const filteredData = useMemo(() => {
    if (timeRange === "all") {
      return { students, contacts, admissions, payments };
    }

    const now = new Date().getTime();
    const daysMap: Record<"7d" | "30d" | "90d", number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    };
    const days = daysMap[timeRange];
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    const filterDate = (created: string | null | undefined) => {
      if (!created) return false;
      return new Date(created).getTime() >= cutoff;
    };

    return {
      students: students.filter((s) => filterDate(s.created_at || s.admission_date)),
      contacts: contacts.filter((c) => filterDate(c.created_at)),
      admissions: admissions.filter((a) => filterDate(a.created_at)),
      payments: payments.filter((p) => filterDate(p.payment_date || p.created_at)),
    };
  }, [timeRange, students, contacts, admissions, payments]);

  // Real calculations
  const totalStudents = students.length;
  const filteredStudentsCount = filteredData.students.length;
  const activeStudents = students.filter((s) => s.status !== "dropped_out").length;
  const totalInquiries = contacts.length;
  const filteredInquiriesCount = filteredData.contacts.length;
  const totalAdmissions = admissions.length;
  const filteredAdmissionsCount = filteredData.admissions.length;

  const totalRevenue = useMemo(() => {
    return filteredData.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredData.payments]);

  const allTimeRevenue = useMemo(() => {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  // Course distribution (real counts)
  const courseDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      const c = s.course || "Other Courses";
      counts[c] = (counts[c] || 0) + 1;
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries.map(([name, count]) => ({
      name,
      count,
      pct: totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0,
    }));
  }, [students, totalStudents]);

  // Payment mode distribution (real counts)
  const paymentModeStats = useMemo(() => {
    const modes: Record<string, { count: number; total: number }> = {};
    payments.forEach((p) => {
      const mode = (p.payment_mode || "cash").toLowerCase();
      if (!modes[mode]) modes[mode] = { count: 0, total: 0 };
      modes[mode].count += 1;
      modes[mode].total += Number(p.amount) || 0;
    });

    const totalCount = payments.length || 1;
    return Object.entries(modes).map(([mode, data]) => ({
      mode: mode.toUpperCase(),
      count: data.count,
      total: data.total,
      pct: Math.round((data.count / totalCount) * 100),
    }));
  }, [payments]);

  // Blog engagement
  const totalBlogViews = useMemo(() => {
    return blogs.reduce((sum, b) => sum + (b.views || 0), 0);
  }, [blogs]);

  const topBlogs = useMemo(() => {
    return [...blogs].sort((a, b) => (b.views || 0) - (a.views || 0));
  }, [blogs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Web & Growth Analytics
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Database
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real student admissions, website lead conversion, and fee metrics.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Time Filter Pills */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium border border-slate-200/60 dark:border-slate-700/60">
            {(
              [
                { id: "7d", label: "7D" },
                { id: "30d", label: "30D" },
                { id: "90d", label: "90D" },
                { id: "all", label: "All Time" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  timeRange === t.id
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            title="Refresh database records"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Primary KPI Cards (Real Values) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Enrolled Students */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Enrolled Students
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <GraduationCap size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {timeRange === "all" ? totalStudents : filteredStudentsCount}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {activeStudents} active
            </span>
            <span>·</span>
            <span>{batchesCount} active batches</span>
          </div>
        </div>

        {/* Web Inquiries / Leads */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Web Enquiries
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {timeRange === "all" ? totalInquiries : filteredInquiriesCount}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Contact form leads</span>
            <Link
              href="/admin/contacts"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium"
            >
              View <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>

        {/* Online Admissions */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Course Applications
            </span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {timeRange === "all" ? totalAdmissions : filteredAdmissionsCount}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Online portal submissions</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {coursesCount} courses
            </span>
          </div>
        </div>

        {/* Fees Collected */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Fee Collections
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <IndianRupee size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{filteredData.payments.length} verified payments</span>
            {timeRange !== "all" && (
              <span className="text-[11px] text-slate-400">
                (All: ₹{allTimeRevenue.toLocaleString("en-IN")})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Real Lead Funnel + Course Enrollment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Lead & Enrollment Funnel */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Real Student Enrollment Funnel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Conversion journey from web enquiries to registered classroom students.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Verified Records
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {/* Step 1: Web Inquiries */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  1. Website Inquiries Received
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {totalInquiries} {totalInquiries === 1 ? "lead" : "leads"}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{
                    width: `${totalInquiries > 0 ? "100%" : "6%"}`,
                  }}
                />
              </div>
            </div>

            {/* Step 2: Course Applications */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  2. Online Admission Applications
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {totalAdmissions} {totalAdmissions === 1 ? "applicant" : "applicants"}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all"
                  style={{
                    width: `${
                      totalInquiries > 0
                        ? `${Math.min(100, Math.round((totalAdmissions / totalInquiries) * 100))}%`
                        : totalAdmissions > 0
                        ? "100%"
                        : "6%"
                    }`,
                  }}
                />
              </div>
            </div>

            {/* Step 3: Verified Enrolled Students */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  3. Enrolled Classroom Students
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {totalStudents} enrolled ({activeStudents} active)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* Clean Explanatory Note */}
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>
                Offline walk-ins & direct classroom registrations are actively synced
                with student profiles.
              </span>
            </div>
            <Link
              href="/admin/students"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              Manage Students →
            </Link>
          </div>
        </div>

        {/* Real Payment Method Split */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Fee Collection Modes
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Based on {payments.length} verified transactions.
            </p>
          </div>

          <div className="space-y-4">
            {paymentModeStats.map((item) => (
              <div key={item.mode} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                    {item.mode === "UPI" ? (
                      <CreditCard size={13} className="text-blue-500" />
                    ) : (
                      <Banknote size={13} className="text-emerald-500" />
                    )}
                    <span>{item.mode}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ₹{item.total.toLocaleString("en-IN")}
                    </span>
                    <span className="text-slate-400 text-[11px] ml-1.5">
                      ({item.count} txns · {item.pct}%)
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.mode === "UPI" ? "bg-blue-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Average Transaction stat */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Avg. Receipt Value:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              ₹
              {payments.length > 0
                ? Math.round(allTimeRevenue / payments.length).toLocaleString("en-IN")
                : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Course Enrollment Distribution & Real Blog Readership */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Course Distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Course Enrollment Breakdown
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real student counts enrolled in each academic program.
              </p>
            </div>
            <Link
              href="/admin/batches"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Batches →
            </Link>
          </div>

          <div className="space-y-3.5 pt-1">
            {courseDistribution.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No course enrollments found.
              </p>
            ) : (
              courseDistribution.map((c, i) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">
                      {c.name}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white shrink-0 ml-2">
                      {c.count} {c.count === 1 ? "student" : "students"} ({c.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        i === 0
                          ? "bg-blue-600"
                          : i === 1
                          ? "bg-indigo-500"
                          : i === 2
                          ? "bg-violet-500"
                          : "bg-sky-500"
                      }`}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real Public Blog Engagement */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Public Articles & Readership
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {totalBlogViews} total reads
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real reader engagement on institute announcements & tech blogs.
              </p>
            </div>
            <Link
              href="/admin/blogs"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topBlogs.slice(0, 4).map((b, i) => (
              <div key={b.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 text-center text-xs font-semibold text-slate-400 shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {b.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{b.category}</span>
                      <span>·</span>
                      <span>{formatDate(b.published_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                    {b.views} reads
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Students Enrolled Stream (Verified Real Data) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recently Enrolled Students
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live admissions records directly synced with the database.
            </p>
          </div>
          <Link
            href="/admin/students"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            All Students ({students.length}) →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <th className="pb-2">Student</th>
                <th className="pb-2">Student ID</th>
                <th className="pb-2">Enrolled Course</th>
                <th className="pb-2">Admission Date</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {students.slice(0, 6).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                    {s.name}
                  </td>
                  <td className="py-2.5 font-mono text-slate-500 text-[11px]">
                    {s.student_id || "—"}
                  </td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-300 truncate max-w-xs">
                    {s.course || "General"}
                  </td>
                  <td className="py-2.5 text-slate-400">
                    {formatDate(s.admission_date || s.created_at)}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        s.status === "dropped_out"
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                      }`}
                    >
                      {s.status || "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
