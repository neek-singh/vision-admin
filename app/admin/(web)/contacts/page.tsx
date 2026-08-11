import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DeleteButton from "@/components/ui/DeleteButton";

export const unstable_instant = false;

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
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-blue-950">Contact Requests</h1>
          <p className="text-gray-500 mt-1">{list.length} total enquir{list.length !== 1 ? "ies" : "y"} received.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-orange-50 text-orange-900 border-b border-gray-100 text-sm">
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">Message</th>
                <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">Date & Actions</th>
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
                    <td className="px-6 py-4 text-right">
                      <div className="text-[10px] text-gray-400 mb-1">{new Date(row.created_at).toLocaleDateString()}</div>
                      <DeleteButton id={row.id} table="contacts" title={row.name} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-50">
          {list.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              No contact requests yet.
            </div>
          ) : (
            list.map((row) => (
              <div key={row.id} className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-700 text-base">
                      {row.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 leading-tight">{row.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(row.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <DeleteButton id={row.id} table="contacts" title={row.name} />
                </div>

                <div className="grid grid-cols-1 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</span>
                    <a href={`tel:${row.phone}`} className="text-sm font-black text-blue-600">{row.phone}</a>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</span>
                    {row.email ? (
                      <a href={`mailto:${row.email}`} className="text-sm font-black text-blue-600 truncate">{row.email}</a>
                    ) : (
                      <span className="text-sm font-bold text-slate-400 italic">No email provided</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Message Content</span>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed italic">
                    "{row.message || "No message content."}"
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
