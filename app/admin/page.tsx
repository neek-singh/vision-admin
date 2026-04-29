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
  const [blogs, gallery, admissions, contacts] = await Promise.all([
    supabase.from("blogs").select("id", { count: "exact", head: true }),
    supabase.from("gallery").select("id", { count: "exact", head: true }),
    supabase.from("admissions").select("id", { count: "exact", head: true }),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
  ]);

  return {
    blogs: blogs.count ?? 0,
    gallery: gallery.count ?? 0,
    admissions: admissions.count ?? 0,
    contacts: contacts.count ?? 0,
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
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-blue-950">
            Admin Dashboard 👑
          </h1>
          <p className="text-gray-500">
            Welcome back, manage your institute here.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card label="Blogs" value={stats.blogs} />
          <Card label="Gallery" value={stats.gallery} />
          <Card label="Admissions" value={stats.admissions} />
          <Card label="Contacts" value={stats.contacts} />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <QuickLink href="/admin/blogs" label="Manage Blogs" />
          <QuickLink href="/admin/gallery" label="Gallery" />
          <QuickLink href="/admin/admissions" label="Admissions" />
          <QuickLink href="/admin/contacts" label="Contacts" />
          <QuickLink href="/admin/stats" label="Manage Stats" />
        </div>

        {/* Recent Data */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Admissions */}
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

          {/* Contacts */}
          <Box title="Recent Contacts">
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

        </div>
      </div>
    </main>
  );
}

// 🔹 UI Components

function Card({ label, value }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow border">
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-bold text-blue-950">{value}</p>
    </div>
  );
}

function QuickLink({ href, label }: any) {
  return (
    <Link
      href={href}
      className="bg-blue-600 text-white p-4 rounded-xl text-center font-semibold hover:bg-blue-500"
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