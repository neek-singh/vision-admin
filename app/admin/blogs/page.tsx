import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import DeleteButton from "@/components/admin/DeleteButton";
import fs from "fs";
import path from "path";

export const revalidate = 0;

// 🔐 Server Supabase
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

export default async function AdminBlogsPage() {
  const supabase = await getSupabase();

  // 🔐 Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 👑 Role check
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/unauthorized");
  }

  // 📊 Fetch blogs
  const blogsFilePath = "c:\\Users\\as007\\vision-web\\data\\blogs.json";

  let blogsList: any[] = [];

  try {
    if (fs.existsSync(blogsFilePath)) {
      const fileData = fs.readFileSync(blogsFilePath, "utf-8");
      blogsList = JSON.parse(fileData);
    }
  } catch (e) {
    console.error("Error fetching blogs from JSON:", e);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-950">
          Manage Blogs
        </h1>

        <Button href="/admin/blogs/new">
          + New Blog
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow border overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-blue-900">Title</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-blue-900">Status</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-blue-900">Date</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right text-blue-900">Actions</th>
              </tr>
            </thead>

            <tbody>
              {blogsList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-500">
                    No blogs found
                  </td>
                </tr>
              ) : (
                blogsList.map((blog) => (
                  <tr key={blog.id} className="border-t hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {blog.title}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${blog.is_published
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {blog.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-500">
                      {blog.created_at
                        ? new Date(blog.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-right flex gap-6 justify-end items-center">
                      <Link
                        href={`/admin/blogs/${blog.id}/edit`}
                        className="text-blue-600 hover:text-blue-800 font-bold text-sm"
                      >
                        Edit
                      </Link>
                      <DeleteButton
                        id={blog.id}
                        table="blogs"
                        title={blog.title}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {blogsList.length === 0 ? (
            <div className="p-10 text-center text-slate-400 font-bold">
              No blogs found
            </div>
          ) : (
            blogsList.map((blog) => (
              <div key={blog.id} className="p-5 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <h4 className="font-black text-slate-900 leading-tight flex-1">{blog.title}</h4>
                  <span
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${blog.is_published
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    {blog.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {blog.created_at ? new Date(blog.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                  </p>
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/admin/blogs/${blog.id}/edit`}
                      className="text-blue-600 font-black text-xs uppercase tracking-widest"
                    >
                      Edit
                    </Link>
                    <DeleteButton
                      id={blog.id}
                      table="blogs"
                      title={blog.title}
                    />
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