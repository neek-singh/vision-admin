import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

export default async function AdminContactsPage() {
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

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, name, phone, email, message, created_at")
    .order("created_at", { ascending: false });

  if (error) console.error("Error fetching contacts:", error);
  const list = contacts || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-blue-950">Contact Requests</h1>
        <p className="text-gray-500 mt-1">{list.length} total enquir{list.length !== 1 ? "ies" : "y"} received.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-orange-50 text-orange-900 border-b border-gray-100 text-sm">
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Phone</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold">Message</th>
              <th className="px-6 py-4 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-gray-400">No contact requests yet.</td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-sm">
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-700 text-sm flex-shrink-0">
                        {row.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      {row.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a href={`tel:${row.phone}`} className="text-blue-600 hover:underline font-medium">{row.phone}</a>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {row.email ? <a href={`mailto:${row.email}`} className="hover:underline text-blue-600">{row.email}</a> : "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs">
                    <p className="line-clamp-2">{row.message || "—"}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-400 whitespace-nowrap">{new Date(row.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
