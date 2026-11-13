import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import DeleteButton from "@/components/ui/DeleteButton";
import { Mail, Phone, MessageSquare, Calendar, Users } from "lucide-react";

export const unstable_instant = false;

export default async function AdminContactsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/unauthorized");

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, phone, email, message, created_at")
    .order("created_at", { ascending: false });

  const list = contacts || [];

  // Stats
  const todayStr = new Date().toISOString().split("T")[0];
  const todayCount = list.filter(c => c.created_at?.startsWith(todayStr)).length;
  const withEmail = list.filter(c => c.email).length;
  const withMessage = list.filter(c => c.message).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Web Enquiries
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Contact form submissions from your website
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200/60 dark:border-rose-800/30">
          <Mail size={13} className="text-rose-500" />
          <span className="text-xs font-black text-rose-600 dark:text-rose-400">
            {list.length} Total Enquiries
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: list.length, icon: Users, color: "text-slate-600 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50" },
          { label: "Today", value: todayCount, icon: Calendar, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/30" },
          { label: "With Email", value: withEmail, icon: Mail, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-800/30" },
          { label: "With Message", value: withMessage, icon: MessageSquare, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/30" },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 p-3.5 rounded-2xl border shadow-sm ${s.color}`}>
            <s.icon size={16} className="shrink-0" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 leading-none">{s.label}</p>
              <p className="text-xl font-black leading-tight mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60">
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Sender</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Contact</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Message</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Date / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No enquiries received yet.
                  </td>
                </tr>
              ) : (
                list.map((row, i) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-[11px] font-black shrink-0">
                          {row.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{row.name}</p>
                          {i === 0 && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-rose-50 text-rose-500 dark:bg-rose-950/30 rounded-full">New</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-1">
                        {row.phone && (
                          <a href={`tel:${row.phone}`} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                            <Phone size={11} /> {row.phone}
                          </a>
                        )}
                        {row.email && (
                          <a href={`mailto:${row.email}`} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 truncate max-w-[160px]">
                            <Mail size={11} /> {row.email}
                          </a>
                        )}
                        {!row.phone && !row.email && <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {row.message || <span className="italic text-slate-300 dark:text-slate-600">No message</span>}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="text-[10px] text-slate-400 font-medium mb-1.5">
                        {new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <DeleteButton id={row.id} table="contacts" title={row.name} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/40">
          {list.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No enquiries yet.</div>
          ) : (
            list.map((row, i) => (
              <div key={row.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-black shrink-0">
                      {row.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm">{row.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <DeleteButton id={row.id} table="contacts" title={row.name} />
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800/40">
                  {row.phone && (
                    <a href={`tel:${row.phone}`} className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <Phone size={12} /> {row.phone}
                    </a>
                  )}
                  {row.email && (
                    <a href={`mailto:${row.email}`} className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      <Mail size={12} /> {row.email}
                    </a>
                  )}
                </div>

                {row.message && (
                  <div className="bg-white dark:bg-slate-800/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800/30">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Message</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">"{row.message}"</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
