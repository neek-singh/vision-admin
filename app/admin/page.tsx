import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

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

// 📊 Stats Fetch
async function getStats(supabase: any) {
  const [blogs, gallery, admissions, contacts, courses, students] = await Promise.all([
    supabase.from("blogs").select("id", { count: "exact", head: true }),
    supabase.from("gallery").select("id", { count: "exact", head: true }),
    supabase.from("admissions").select("id", { count: "exact", head: true }),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
  ]);

  return {
    blogs: blogs.count ?? 0,
    gallery: gallery.count ?? 0,
    admissions: admissions.count ?? 0,
    contacts: contacts.count ?? 0,
    courses: courses.count ?? 0,
    students: students.count ?? 0,
  };
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

  // 📊 3. Fetch Data
  const stats = await getStats(supabase);

  const { data: recentAdmissions } = await supabase
    .from("admissions")
    .select("id, student_name, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentContacts } = await supabase
    .from("contacts")
    .select("id, name, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-black text-blue-950">
            Admin Overview 👑
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Manage your entire Vision IT ecosystem from one place.
          </p>
        </div>

        {/* Vision Learn Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-black text-blue-950 uppercase tracking-wider">Vision Learn (LMS)</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card label="Total Students" value={stats.students} color="bg-blue-600" />
            <Card label="Active Courses" value={stats.courses} color="bg-indigo-600" />
            <Card label="New Admissions" value={stats.admissions} color="bg-violet-600" />
            <Card label="LMS Activity" value="Active" color="bg-emerald-600" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickLink href="/admin/lms" label="LMS Dashboard" />
            <QuickLink href="/admin/admissions" label="Admissions" />
            <QuickLink href="/admin/students" label="Manage Students" />
            <QuickLink href="/admin/courses" label="Course Content" />
          </div>

          <Box title="Recent Admissions">
            {!recentAdmissions?.length ? (
              <Empty text="No admissions yet" />
            ) : (
              recentAdmissions.map((item: any) => (
                <Row
                  key={item.id}
                  title={item.student_name}
                  date={item.created_at}
                />
              ))
            )}
          </Box>
        </section>

        {/* Vision Web Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
            <h2 className="text-xl font-black text-blue-950 uppercase tracking-wider">Vision Web (Main)</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card label="Total Blogs" value={stats.blogs} color="bg-orange-500" />
            <Card label="Gallery Images" value={stats.gallery} color="bg-amber-500" />
            <Card label="Contact Requests" value={stats.contacts} color="bg-rose-500" />
            <Card label="Batches" value="Running" color="bg-sky-500" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickLink href="/admin/blogs" label="Manage Blogs" color="bg-orange-500" />
            <QuickLink href="/admin/gallery" label="Gallery" color="bg-orange-500" />
            <QuickLink href="/admin/contacts" label="Contact Enquiries" color="bg-orange-500" />
            <QuickLink href="/admin/batches" label="Batches" color="bg-orange-500" />
          </div>

          <Box title="Recent Contact Enquiries">
            {!recentContacts?.length ? (
              <Empty text="No contacts yet" />
            ) : (
              recentContacts.map((item: any) => (
                <Row
                  key={item.id}
                  title={item.name}
                  date={item.created_at}
                />
              ))
            )}
          </Box>
        </section>
      </div>
    </main>
  );
}

// 🔹 UI Components

function Card({ label, value, color = "bg-blue-600" }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:shadow-md transition-shadow">
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-black text-blue-950">{value}</p>
        <div className={`w-8 h-1 rounded-full ${color}`}></div>
      </div>
    </div>
  );
}

function QuickLink({ href, label, color = "bg-blue-600" }: any) {
  return (
    <Link
      href={href}
      className={`${color} text-white px-4 py-3 rounded-xl text-center text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm hover:shadow-md active:scale-95`}
    >
      {label}
    </Link>
  );
}

function Box({ title, children }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow border">
      <h2 className="font-bold mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ title, date }: any) {
  return (
    <div className="flex justify-between text-sm text-gray-700">
      <span>{title}</span>
      <span className="text-gray-400">
        {new Date(date).toLocaleDateString()}
      </span>
    </div>
  );
}

function Empty({ text }: any) {
  return <p className="text-gray-400 text-sm">{text}</p>;
}