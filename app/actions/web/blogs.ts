"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import fs from "fs";
import path from "path";

function getBlogsFilePath() {
  const candidates = [
    path.resolve(process.cwd(), "..", "vision-web"),
    "c:\\Users\\as007\\vision project\\vision-web",
    "c:\\Users\\as007\\vision-web",
  ];
  let basePath = candidates[0];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      basePath = candidate;
      break;
    }
  }
  const filePath = path.join(basePath, "features", "blog", "data", "blogs.json");
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return filePath;
}

export async function saveBlog(formData: any) {
  try {
    await requireAdmin();

    const blogsFilePath = getBlogsFilePath();
    let blogs: any[] = [];
    if (fs.existsSync(blogsFilePath)) {
      blogs = JSON.parse(fs.readFileSync(blogsFilePath, "utf-8"));
    }

    if (formData.id) {
      blogs = blogs.map((b: any) => b.id === formData.id ? { ...b, ...formData } : b);
    } else {
      const newBlog = {
        ...formData,
        id: Math.random().toString(36).slice(2),
        published_at: new Date().toISOString(),
        views: 0
      };
      blogs.push(newBlog);
    }

    fs.writeFileSync(blogsFilePath, JSON.stringify(blogs, null, 2), "utf-8");

    revalidatePath("/blog");
    if (formData.slug) {
      revalidatePath(`/blog/${formData.slug}`);
    }
    revalidatePath("/admin/blogs");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to save blog to JSON:", e);
    return { error: e.message || "Unauthorized" };
  }
}

export async function deleteBlog(id: string) {
  try {
    await requireAdmin();

    const blogsFilePath = getBlogsFilePath();
    let blogs: any[] = [];
    if (fs.existsSync(blogsFilePath)) {
      blogs = JSON.parse(fs.readFileSync(blogsFilePath, "utf-8"));
    }

    const updatedBlogs = blogs.filter((b: any) => b.id !== id);
    fs.writeFileSync(blogsFilePath, JSON.stringify(updatedBlogs, null, 2), "utf-8");

    revalidatePath("/blog");
    revalidatePath("/admin/blogs");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to delete blog from JSON:", e);
    return { error: e.message || "Unauthorized" };
  }
}
