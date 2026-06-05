import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UserRoleManager from "@/components/system/UserRoleManager";

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
        <h1 className="text-3xl font-black text-blue-950">Manage Users</h1>
        <p className="text-gray-500 mt-2">View and manage roles for all registered users.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 text-blue-900 border-b border-gray-100">
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">User Details</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Email Address</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px]">Current Role</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!users || users.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold">No users registered yet.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-55 hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">
                          {user.full_name ? user.full_name[0] : 'U'}
                        </div>
                        <span className="font-bold text-gray-900">{user.full_name || "New User"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        user.role === 'admin' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <UserRoleManager userId={user.id} currentRole={user.role} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {(!users || users.length === 0) ? (
            <div className="px-6 py-12 text-center text-gray-400 font-bold">
              No users registered yet.
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-lg font-black">
                      {user.full_name ? user.full_name[0] : 'U'}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 leading-tight">{user.full_name || "New User"}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Registered User</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    user.role === 'admin' 
                      ? 'bg-purple-50 text-purple-700 border-purple-100' 
                      : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                  }`}>
                    {user.role}
                  </span>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Email Address</span>
                  <p className="text-sm font-bold text-slate-700 truncate">{user.email}</p>
                </div>

                <div className="pt-4 flex flex-col gap-2 border-t border-slate-50">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-center mb-1">Change User Permission</span>
                   <UserRoleManager userId={user.id} currentRole={user.role} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
