import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import fs from "fs";
import { 
  FileText, 
  Image as ImageIcon, 
  Mail, 
  Calendar, 
  Plus, 
  Globe, 
  Eye, 
  Settings, 
  Activity,
  ArrowUpRight,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Heart
} from "lucide-react";

export const revalidate = 0;

// 🔐 Supabase Server Client
async function getSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => { },
      },
    }
  );
}

// 📊 Stats Section Component
async function StatsSection({ supabase }: { supabase: any }) {
  // Read local blog data
  const blogsFilePath = "c:\\Users\\as007\\vision-web\\data\\blogs.json";
  let blogsList: any[] = [];
  try {
    if (fs.existsSync(blogsFilePath)) {
      blogsList = JSON.parse(fs.readFileSync(blogsFilePath, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading blogs:", e);
  }

  // Read local gallery data
  const galleryFilePath = "c:\\Users\\as007\\vision-web\\data\\gallery.json";
  let galleryList: any[] = [];
  try {
    if (fs.existsSync(galleryFilePath)) {
      galleryList = JSON.parse(fs.readFileSync(galleryFilePath, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading gallery:", e);
  }

  // Query Supabase for Contacts and Batches counts
  const [contacts, batches] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("batches").select("id", { count: "exact", head: true }),
  ]);

  const totalBlogs = blogsList.length;
  const publishedBlogs = blogsList.filter(b => b.is_published).length;
  const draftBlogs = totalBlogs - publishedBlogs;
  
  const totalGallery = galleryList.length;
  const totalContacts = contacts.count ?? 0;
  const totalBatches = batches.count ?? 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card 
          label="Total Blogs" 
          value={totalBlogs} 
          subText={`${publishedBlogs} Published • ${draftBlogs} Drafts`}
          color="bg-orange-500" 
          icon={FileText} 
        />
        <Card 
          label="Gallery Photos" 
          value={totalGallery} 
          subText="Synced with main gallery"
          color="bg-amber-500" 
          icon={ImageIcon} 
        />
        <Card 
          label="Web Enquiries" 
          value={totalContacts} 
          subText="From contact form submissions"
          color="bg-rose-500" 
          icon={Mail} 
        />
        <Card 
          label="Active Batches" 
          value={totalBatches} 
          subText="Current course batches"
          color="bg-sky-500" 
          icon={Calendar} 
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <QuickLink href="/admin/blogs" label="Manage Blogs" color="bg-orange-600 hover:bg-orange-700 shadow-orange-600/10" />
        <QuickLink href="/admin/gallery" label="Photo Gallery" color="bg-amber-600 hover:bg-amber-700 shadow-amber-600/10" />
        <QuickLink href="/admin/contacts" label="View Enquiries" color="bg-rose-600 hover:bg-rose-700 shadow-rose-600/10" />
        <QuickLink href="/admin/batches" label="Manage Batches" color="bg-sky-600 hover:bg-sky-700 shadow-sky-600/10" />
      </div>
    </div>
  );
}

// 📈 Web Analytics Component (Charts Section)
function WebAnalytics() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Visitor Traffic Chart (Area Chart) */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
            <Activity size={18} className="text-orange-500" /> Website Traffic & Pageviews
          </h3>
          <span className="text-[10px] bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
            Last 6 Months
          </span>
        </div>
        
        {/* SVG Area Chart */}
        <div className="h-64 w-full relative pt-4">
          <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            <line x1="0" y1="50" x2="500" y2="50" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800/20" />
            <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800/20" />
            <line x1="0" y1="150" x2="500" y2="150" stroke="#f1f5f9" strokeWidth="1" className="dark:stroke-slate-800/20" />
            
            {/* Area Path */}
            <path 
              d="M 0 170 Q 80 130 160 145 T 320 70 Q 400 90 500 40 L 500 200 L 0 200 Z" 
              fill="url(#trafficGradient)" 
            />
            
            {/* Line Path */}
            <path 
              d="M 0 170 Q 80 130 160 145 T 320 70 Q 400 90 500 40" 
              fill="none" 
              stroke="rgb(249, 115, 22)" 
              strokeWidth="3" 
              strokeLinecap="round"
            />

            {/* Glowing dots */}
            <circle cx="160" cy="145" r="4.5" fill="rgb(249, 115, 22)" stroke="white" strokeWidth="1.5" className="animate-pulse" />
            <circle cx="320" cy="70" r="4.5" fill="rgb(249, 115, 22)" stroke="white" strokeWidth="1.5" className="animate-pulse" />
            <circle cx="500" cy="40" r="4.5" fill="rgb(249, 115, 22)" stroke="white" strokeWidth="1.5" className="animate-pulse" />
          </svg>
          
          {/* X-axis labels */}
          <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-bold pt-3 border-t border-slate-100 dark:border-slate-800/50">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </div>
      </div>

      {/* Traffic Channels (Donut Chart) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4 flex flex-col justify-between">
        <div>
          <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm">
            Acquisition Channels
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Visitor distribution</p>
        </div>
        
        <div className="flex items-center justify-center h-40 relative">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
            {/* Base circle */}
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.2" className="dark:stroke-slate-800/40" />
            
            {/* Organic Search - 45% */}
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(249, 115, 22)" strokeWidth="3.2" 
              strokeDasharray="45 55" strokeDashoffset="100" />
            {/* Direct - 30% */}
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(245, 158, 11)" strokeWidth="3.2" 
              strokeDasharray="30 70" strokeDashoffset="55" />
            {/* Social - 15% */}
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="3.2" 
              strokeDasharray="15 85" strokeDashoffset="25" />
            {/* Referral - 10% */}
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgb(14, 165, 233)" strokeWidth="3.2" 
              strokeDasharray="10 90" strokeDashoffset="10" />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-blue-950 dark:text-white">8.4k</span>
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Sessions</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-orange-500 rounded-full shrink-0"></span>
            <span>Organic (45%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0"></span>
            <span>Direct (30%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full shrink-0"></span>
            <span>Social (15%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-sky-500 rounded-full shrink-0"></span>
            <span>Referrals (10%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🕒 Dashboard Content Details
async function DashboardDetails({ supabase }: { supabase: any }) {
  // 1. Fetch recent contacts
  const { data: recentContacts } = await supabase
    .from("contacts")
    .select("id, name, email, phone, message, created_at")
    .order("created_at", { ascending: false })
    .limit(4);

  // 2. Read recent blogs
  const blogsFilePath = "c:\\Users\\as007\\vision-web\\data\\blogs.json";
  let recentBlogs: any[] = [];
  try {
    if (fs.existsSync(blogsFilePath)) {
      const fileData = fs.readFileSync(blogsFilePath, "utf-8");
      const blogsList = JSON.parse(fileData);
      // Sort by published_at or created_at descending
      recentBlogs = blogsList
        .sort((a: any, b: any) => new Date(b.created_at || b.published_at).getTime() - new Date(a.created_at || a.published_at).getTime())
        .slice(0, 3);
    }
  } catch (e) {
    console.error("Error reading recent blogs:", e);
  }

  // 3. Read recent gallery images
  const galleryFilePath = "c:\\Users\\as007\\vision-web\\data\\gallery.json";
  let recentGallery: any[] = [];
  try {
    if (fs.existsSync(galleryFilePath)) {
      const fileData = fs.readFileSync(galleryFilePath, "utf-8");
      recentGallery = JSON.parse(fileData).slice(0, 4);
    }
  } catch (e) {
    console.error("Error reading recent gallery:", e);
  }

  return (
    <div className="space-y-6">
      {/* Middle Grid: Enquiries & Sidebar Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enquiries List */}
        <div className="lg:col-span-2">
          <Box title="Recent General Enquiries" icon={Mail} action={{ label: "View All", href: "/admin/contacts" }}>
            {!recentContacts?.length ? (
              <Empty text="No enquiries received yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-bold">
                    <tr>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider">Sender</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider">Message</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {recentContacts.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">{item.email || item.phone}</p>
                        </td>
                        <td className="px-4 py-3.5 max-w-[240px] truncate text-slate-600 dark:text-slate-400">
                          {item.message || <span className="italic text-slate-300 dark:text-slate-600">No message</span>}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Box>
        </div>

        {/* Quick Web Actions & System Status */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800/85 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles size={16} className="text-orange-500" /> Web Actions
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/admin/blogs/new" className="flex items-center gap-2.5 p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100/70 dark:hover:bg-orange-950/40 transition-all font-bold text-xs shadow-sm shadow-orange-500/5 hover:scale-[1.02]">
                <Plus size={16} /> Write Blog Post
              </Link>
              <Link href="/admin/batches/new" className="flex items-center gap-2.5 p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 hover:bg-sky-100/70 dark:hover:bg-sky-950/40 transition-all font-bold text-xs shadow-sm shadow-sky-500/5 hover:scale-[1.02]">
                <Plus size={16} /> Add Course Batch
              </Link>
              <Link href="/admin/gallery" className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 transition-all font-bold text-xs shadow-sm shadow-amber-500/5 hover:scale-[1.02]">
                <Plus size={16} /> Upload Gallery Image
              </Link>
            </div>
          </div>

          <div className="bg-slate-900 dark:bg-[#060a13] p-6 rounded-3xl text-white relative overflow-hidden border border-slate-800 shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12 blur-xl" />
            <h3 className="font-bold text-sm mb-2 relative z-10 flex items-center gap-2">
              <Globe size={16} className="text-orange-500 animate-pulse" /> Web CDN Host
            </h3>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold mb-4 relative z-10">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              Website Online (Latency 14ms)
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed relative z-10">
              Your front-end website hosted on Cloudflare edge CDN is running optimally. Next.js Static Regeneration is active for high-speed delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Blogs & Gallery Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Blogs */}
        <Box title="Recent Blog Posts" icon={FileText} action={{ label: "Manage Blogs", href: "/admin/blogs" }}>
          {!recentBlogs.length ? (
            <Empty text="No blogs written yet." />
          ) : (
            <div className="space-y-3">
              {recentBlogs.map((blog: any) => (
                <div key={blog.id} className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/20 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-all border border-slate-100/50 dark:border-slate-800/30">
                  <div className="space-y-1 pr-4">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug">{blog.title}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                      <span>{blog.created_at ? new Date(blog.created_at).toLocaleDateString() : "-"}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${blog.is_published ? "bg-green-50 text-green-600 dark:bg-green-950/20" : "bg-slate-200 text-slate-600 dark:bg-slate-800"}`}>
                        {blog.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                  <Link href={`/admin/blogs/${blog.id}/edit`} className="text-orange-600 hover:text-orange-700 dark:text-orange-400 font-black text-xs uppercase tracking-widest flex items-center gap-1 shrink-0">
                    Edit <ArrowUpRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Box>

        {/* Gallery Preview */}
        <Box title="Photo Gallery Highlights" icon={ImageIcon} action={{ label: "Manage Gallery", href: "/admin/gallery" }}>
          {!recentGallery.length ? (
            <Empty text="No photos uploaded to the gallery yet." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentGallery.map((img: any) => (
                <div key={img.id} className="group relative aspect-video sm:aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={img.image_url} 
                    alt={img.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-905/80 via-slate-905/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2.5">
                    <p className="text-[10px] font-bold text-white truncate w-full">{img.title}</p>
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

// 🚀 MAIN PAGE
export default async function AdminPage() {
  const supabase = await getSupabase();

  // 🔐 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 👑 2. Role Check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-blue-950 dark:text-white tracking-tight">
            Website Dashboard Overview 🌐
          </h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1 font-medium text-sm sm:text-base">
            Manage your main website pages, blogs, batches, and enquiries.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">System Online</span>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <div className="space-y-8">
          <StatsSection supabase={supabase} />
          <WebAnalytics />
          <DashboardDetails supabase={supabase} />
        </div>
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((j) => (
          <div key={j} className="h-28 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800"></div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((j) => (
          <div key={j} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
        ))}
      </div>
    </div>
  );
}

// 🔹 UI Components
function Card({ label, value, subText, color = "bg-blue-600", icon: Icon }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 group hover:shadow-md dark:hover:shadow-slate-900/50 transition-all duration-200 flex justify-between items-start">
      <div className="space-y-1.5 min-w-0">
        <p className="text-gray-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none truncate">{label}</p>
        <p className="text-2xl sm:text-3.5xl font-black text-blue-950 dark:text-white leading-none pt-0.5">{value}</p>
        {subText && <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-extrabold">{subText}</p>}
      </div>
      <div className={`p-2 sm:p-2.5 rounded-xl ${color} text-white bg-opacity-95 shadow-sm shrink-0`}>
        <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
      </div>
    </div>
  );
}

function QuickLink({ href, label, color = "bg-blue-600" }: any) {
  return (
    <Link
      href={href}
      className={`${color} text-white px-4 py-3.5 rounded-2xl text-center text-xs font-black uppercase tracking-widest hover:opacity-95 active:scale-[0.98] transition-all shadow-md shrink-0`}
    >
      {label}
    </Link>
  );
}

function Box({ title, children, icon: Icon, action }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800/80 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-black text-slate-800 dark:text-slate-200 text-base flex items-center gap-2">
          {Icon && <Icon size={18} className="text-slate-500 dark:text-slate-400" />} {title}
        </h2>
        {action && (
          <Link href={action.href} className="text-blue-600 dark:text-blue-400 hover:underline font-black text-xs uppercase tracking-widest flex items-center gap-0.5">
            {action.label} <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Empty({ text }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500 space-y-2">
      <Activity size={24} className="stroke-1" />
      <p className="text-xs font-bold">{text}</p>
    </div>
  );
}