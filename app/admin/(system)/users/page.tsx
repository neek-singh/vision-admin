import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UsersClient from "@/components/system/UsersClient";

export const revalidate = 0;

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

export default async function AdminUsersPage() {
  const supabase = await getSupabase();

  // 🔐 Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 👑 Admin check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching users:", error);
  }

  return (
    <div className="container mx-auto px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-blue-950 dark:text-white tracking-tight">Manage Users</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-2">View, monitor, and assign roles for staff members and students.</p>
      </div>

      <UsersClient initialUsers={users || []} />
    </div>
  );
}

