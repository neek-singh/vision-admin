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

        <div className="overflow-x-auto">
          <table className="w-full text-left">

            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right text-black">Actions</th>
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
                  <tr key={blog.id} className="border-t">

                    <td className="px-6 py-4 font-medium">
                      {blog.title}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${blog.is_published
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {blog.is_published ? "Published" : "Draft"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {blog.created_at
                        ? new Date(blog.created_at).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="px-6 py-4 text-right flex gap-4 justify-end">
                      <Link
                        href={`/admin/blogs/${blog.id}/edit`}
                        className="text-blue-600 font-semibold"
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

      </div>
    </div>
  );
}