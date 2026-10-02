import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DeleteButton from "@/components/ui/DeleteButton";
import fs from "fs";
import { FileText, Plus, ArrowUpRight, Globe, PenLine, Eye } from "lucide-react";

export const unstable_instant = false;

export default async function AdminBlogsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/unauthorized");

  // Read blogs from JSON
  let blogsList: any[] = [];
  try {
    const p = "c:\\Users\\as007\\vision-web\\features\\blog\\data\\blogs.json";
    if (fs.existsSync(p)) blogsList = JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {}

  const published = blogsList.filter(b => b.is_published);
  const drafts = blogsList.filter(b => !b.is_published);

  // Sort by date
  blogsList = [...blogsList].sort((a, b) =>
    new Date(b.created_at || b.published_at || 0).getTime() -
    new Date(a.created_at || a.published_at || 0).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Manage Blogs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Write, edit and publish blog posts for your website
          </p>
        </div>
        <Link
          href="/admin/blogs/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-orange-500/20 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <Plus size={14} /> New Blog Post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: blogsList.length, icon: FileText, color: "text-slate-600 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50" },
          { label: "Published", value: published.length, icon: Globe, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/30" },
          { label: "Drafts", value: drafts.length, icon: PenLine, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/30" },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 p-3.5 rounded-2xl border shadow-sm ${s.color}`}>
            <s.icon size={15} className="shrink-0" />
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
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">#</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Title</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {blogsList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-slate-400 text-sm">
                    No blogs found. <Link href="/admin/blogs/new" className="text-orange-500 hover:underline font-bold">Write your first post →</Link>
                  </td>
                </tr>
              ) : (
                blogsList.map((blog, i) => (
                  <tr key={blog.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-black text-slate-400 dark:text-slate-500">{i + 1}</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-sm">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">{blog.title}</p>
                      {blog.excerpt && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">{blog.excerpt}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        blog.is_published
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${blog.is_published ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {blog.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                      {blog.created_at
                        ? new Date(blog.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/blogs/${blog.id}/edit`}
                          className="text-orange-500 hover:text-orange-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Edit <ArrowUpRight size={11} />
                        </Link>
                        <DeleteButton id={blog.id} table="blogs" title={blog.title} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/40">
          {blogsList.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No blogs yet.</div>
          ) : (
            blogsList.map((blog) => (
              <div key={blog.id} className="p-4 space-y-2.5">
                <div className="flex justify-between items-start gap-3">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex-1 leading-snug">{blog.title}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 ${
                    blog.is_published ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                  }`}>
                    {blog.is_published ? "Live" : "Draft"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 font-medium">
                    {blog.created_at ? new Date(blog.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </p>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/blogs/${blog.id}/edit`} className="text-orange-500 font-black text-[10px] uppercase tracking-widest">
                      Edit
                    </Link>
                    <DeleteButton id={blog.id} table="blogs" title={blog.title} />
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
