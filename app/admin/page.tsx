import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import fs from "fs";
import { cacheLife } from "next/cache";
import {
  FileText, Image as ImageIcon, Mail, Calendar,
  ArrowUpRight, Users, IndianRupee, BookOpen,
  ClipboardList, TrendingUp, CheckCircle2, Clock,
  Plus, Zap, Globe, Activity,
} from "lucide-react";

// ── Cached local JSON reads ──────────────────────────────
async function getBlogsCached() {
  "use cache";
  cacheLife("minutes");
  try {
    const p = "c:\\Users\\as007\\vision-web\\features\\blog\\data\\blogs.json";
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}
  return [];
}

async function getGalleryCached() {
  "use cache";
  cacheLife("minutes");
  try {
    const p = "c:\\Users\\as007\\vision-web\\features\\gallery\\data\\gallery.json";
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}
  return [];
}

// ── Supabase client ──────────────────────────────────────
async function getSupabase() {
  const cs = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cs.getAll(), setAll: () => {} } }
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default async function AdminPage() {
  const supabase = await getSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/unauthorized");

  const now = new Date();
  const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().split("T")[0];
  const h = now.getHours();
  const greeting = h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-5 max-w-screen-xl mx-auto">
      {/* ── Compact Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{greeting} 👋</p>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Admin Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/30">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            System Online
          </span>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent supabase={supabase} todayStr={todayStr} />
      </Suspense>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DASHBOARD CONTENT (all data fetched here)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function DashboardContent({ supabase, todayStr }: { supabase: any; todayStr: string }) {
  // ── Parallel data fetch ──
  const [
    { count: totalStudents },
    { count: totalBatches },
    { count: totalContacts },
    { count: totalAdmissions },
    { count: todayAdmissions },
    { data: recentContacts },
    { data: recentStudents },
    feesRes,
    blogsRaw,
    galleryRaw,
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("batches").select("id", { count: "exact", head: true }),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("admissions").select("id", { count: "exact", head: true }),
    supabase.from("admissions").select("id", { count: "exact", head: true }).gte("created_at", todayStr),
    supabase.from("contacts").select("id,name,email,phone,message,created_at")
      .order("created_at", { ascending: false }).limit(5),
    supabase.from("students").select("id,name,student_id,created_at")
      .order("created_at", { ascending: false }).limit(5),
    supabase.from("fees").select("id,final_fee,increment_amount,payments(amount)"),
    getBlogsCached(),
    getGalleryCached(),
  ]);

  // ── Fee calculations ──
  const fees: any[] = feesRes.data || [];
  const totalCollection = fees.reduce((acc, f) => {
    return acc + (f.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0);
  }, 0);
  const totalPending = fees.reduce((acc, f) => {
    const paid = f.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
    return acc + (Number(f.final_fee || 0) + Number(f.increment_amount || 0) - paid);
  }, 0);

  // ── Blog stats ──
  const blogs: any[] = blogsRaw || [];
  const publishedBlogs = blogs.filter((b) => b.is_published).length;
  const gallery: any[] = galleryRaw || [];

  // ── Stats rows ──
  const lmsStats = [
    { label: "Students", value: totalStudents ?? 0, href: "/admin/students", icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200/60 dark:border-blue-800/30" },
    { label: "Batches", value: totalBatches ?? 0, href: "/admin/batches", icon: Calendar, color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200/60 dark:border-violet-800/30" },
    { label: "Admissions", value: totalAdmissions ?? 0, sub: `${todayAdmissions ?? 0} today`, href: "/admin/admissions", icon: ClipboardList, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200/60 dark:border-emerald-800/30" },
    { label: "Collected", value: `₹${(totalCollection / 1000).toFixed(1)}k`, sub: `₹${(totalPending / 1000).toFixed(1)}k pending`, href: "/admin/fees", icon: IndianRupee, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200/60 dark:border-orange-800/30" },
  ];

  const webStats = [
    { label: "Enquiries", value: totalContacts ?? 0, href: "/admin/contacts", icon: Mail, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200/60 dark:border-rose-800/30" },
    { label: "Blogs", value: blogs.length, sub: `${publishedBlogs} live`, href: "/admin/blogs", icon: FileText, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200/60 dark:border-amber-800/30" },
    { label: "Gallery", value: gallery.length, href: "/admin/gallery", icon: ImageIcon, color: "text-pink-600 bg-pink-50 dark:bg-pink-950/30", border: "border-pink-200/60 dark:border-pink-800/30" },
  ];

  return (
    <div className="space-y-5">

      {/* ── LMS Stats ── */}
      <Section label="LMS Overview">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {lmsStats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      </Section>

      {/* ── Web Stats ── */}
      <Section label="Website">
        <div className="grid grid-cols-3 gap-3">
          {webStats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      </Section>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Enquiries */}
        <div className="lg:col-span-2">
          <Box title="Recent Enquiries" icon={Mail} action={{ label: "View All", href: "/admin/contacts" }}>
            {!recentContacts?.length ? <Empty text="No enquiries yet." /> : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {recentContacts.map((c: any, i: number) => (
                  <div key={c.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-[10px] font-black shrink-0 mt-0.5">
                      {c.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                        <span className="text-[9px] text-slate-400 whitespace-nowrap font-medium">
                          {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{c.email || c.phone}</p>
                      {c.message && <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 italic">{c.message}</p>}
                    </div>
                    {i === 0 && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-rose-50 text-rose-500 dark:bg-rose-950/30 rounded-full shrink-0 mt-0.5">New</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Box>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm">
            <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Zap size={12} className="text-orange-500" /> Quick Actions
            </h3>
            <div className="space-y-1.5">
              {[
                { href: "/admin/blogs/new", label: "Write Blog Post", icon: BookOpen, cls: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/30" },
                { href: "/admin/batches/new", label: "Add Batch", icon: Calendar, cls: "text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 dark:hover:bg-violet-950/40 border-violet-200/50 dark:border-violet-800/30" },
                { href: "/admin/students/add", label: "Add Student", icon: Users, cls: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/30" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all hover:scale-[1.01] ${a.cls}`}>
                  <a.icon size={13} />
                  {a.label}
                  <ArrowUpRight size={11} className="ml-auto opacity-40" />
                </Link>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Globe size={12} className="text-orange-400" /> System Status
            </h3>
            <div className="space-y-2">
              {[
                { label: "Cloudflare CDN", ok: true, ms: "14ms" },
                { label: "Supabase DB", ok: true, ms: "8ms" },
                { label: "Admin Panel", ok: true, ms: "—" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.ok ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                    <span className="text-[10px] text-slate-400 font-medium">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-black ${s.ok ? "text-emerald-400" : "text-red-400"}`}>{s.ok ? "Online" : "Down"}</span>
                    {s.ms !== "—" && <span className="text-[9px] text-slate-600">{s.ms}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: New Students + Recent Blogs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Students */}
        <Box title="New Students" icon={Users} action={{ label: "All Students", href: "/admin/students" }}>
          {!recentStudents?.length ? <Empty text="No students enrolled yet." /> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {recentStudents.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                    {s.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{s.student_id || "—"}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 whitespace-nowrap font-medium">
                    {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Box>

        {/* Recent Blogs */}
        <Box title="Recent Blogs" icon={FileText} action={{ label: "Manage Blogs", href: "/admin/blogs" }}>
          {!blogs.length ? <Empty text="No blogs written yet." /> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {blogs.slice(0, 5).map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.is_published ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"}`} />
                  <p className="flex-1 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{b.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${b.is_published ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                      {b.is_published ? "Live" : "Draft"}
                    </span>
                    <Link href={`/admin/blogs/${b.id}/edit`} className="text-orange-500 hover:text-orange-600">
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Box>
      </div>

    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">{label}</p>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, href, icon: Icon, color, border }: any) {
  return (
    <Link href={href} className={`group flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900/80 rounded-2xl border ${border} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
      <div className={`p-2 rounded-xl ${color} shrink-0`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none">{label}</p>
        <p className="text-lg font-black text-slate-900 dark:text-white leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">{sub}</p>}
      </div>
      <ArrowUpRight size={13} className="ml-auto text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}

function Box({ title, children, icon: Icon, action }: any) {
  return (
    <div className="bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-black text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-widest">
          {Icon && <Icon size={13} className="text-slate-400 dark:text-slate-500" />}
          {title}
        </h2>
        {action && (
          <Link href={action.href} className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-orange-500 dark:hover:text-orange-400 flex items-center gap-0.5 transition-colors">
            {action.label} <ArrowUpRight size={11} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-slate-300 dark:text-slate-600 space-y-1.5">
      <Activity size={18} className="stroke-1" />
      <p className="text-[10px] font-bold">{text}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-64 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
        <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
      </div>
    </div>
  );
}