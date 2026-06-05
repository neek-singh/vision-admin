import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import BlogForm from "@/components/web/BlogForm";
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

export default async function EditBlogPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabase();

  // 🔐 Auth check
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

  // 📄 Fetch blog
  const blogsFilePath = "c:\\Users\\as007\\vision-web\\data\\blogs.json";

  let blog: any = null;

  try {
    if (fs.existsSync(blogsFilePath)) {
      const fileData = fs.readFileSync(blogsFilePath, "utf-8");
      const blogs = JSON.parse(fileData);
      blog = blogs.find((b: any) => b.id === id);
    }
  } catch (e) {
    console.error("Error fetching blog in admin edit:", e);
  }

  if (!blog) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-black text-blue-950">
          Edit Blog Post
        </h1>
        <p className="text-gray-500 mt-2">
          Update your blog content and publish changes.
        </p>
      </div>

      {/* Form */}
      <BlogForm initialData={blog} />

    </div>
  );
}
