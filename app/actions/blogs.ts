"use server";

import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

const blogsFilePath = "c:\\Users\\as007\\vision-web\\data\\blogs.json";


export async function saveBlog(formData: any) {
  try {
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
    return { error: e.message || "Failed to save blog" };
  }
}

export async function deleteBlog(id: string) {
  try {
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
    return { error: e.message || "Failed to delete blog" };
  }
}
