"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { saveBlog } from "@/app/actions/web/blogs";

type BlogData = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url?: string;
  is_published: boolean;
};

export default function BlogForm({ initialData }: { initialData?: BlogData }) {
  const router = useRouter();

  const [formData, setFormData] = useState<BlogData>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    excerpt: initialData?.excerpt || "",
    content: initialData?.content || "",
    image_url: initialData?.image_url || "",
    is_published: initialData?.is_published || false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 🔧 Handle input
  const handleChange = (e: any) => {
    const { name, value } = e.target;

    if (name === "title") {
      const slug = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      setFormData({ ...formData, title: value, slug });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCheckboxChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.checked });
  };

  // 🔥 Slug generator (improved)
  const generateSlug = () => {
    if (!formData.title) return;

    const slug = formData.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    setFormData({ ...formData, slug });
  };

  // 🔐 Validation
  const validate = () => {
    if (!formData.title.trim()) return "Title is required";
    if (!formData.slug.trim()) return "Slug is required";
    if (!formData.content.trim()) return "Content is required";

    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      return "Slug must be lowercase and URL-friendly";
    }

    return "";
  };

  // 🚀 Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await saveBlog({
        ...formData,
        id: initialData?.id
      });

      if (result.error) throw new Error(result.error);

      router.push("/admin/blogs");
      router.refresh();
    } catch (err: any) {
      console.error(err);

      if (err.code === "23505") {
        setError("Slug already exists. Try a different one.");
      } else {
        setError(err.message || "Something went wrong");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800/80 max-w-4xl mx-auto space-y-6"
    >
      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-medium rounded-xl border border-rose-200/60 dark:border-rose-900/40">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Blog Title</label>
        <input
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter blog title"
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">URL Slug</label>
        <div className="flex gap-2">
          <input
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            placeholder="url-slug-here"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs font-normal text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
          />
          <Button type="button" onClick={generateSlug} variant="outline" size="sm" className="shrink-0">
            Generate
          </Button>
        </div>
      </div>

      {/* Featured Image */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Featured Image URL</label>
        <div className="space-y-3">
          <input
            name="image_url"
            value={formData.image_url || ""}
            onChange={handleChange}
            placeholder="https://..."
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs font-normal text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
          />
          {formData.image_url && (
            <div className="relative w-40 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs bg-slate-100 dark:bg-slate-950">
              <img
                src={formData.image_url}
                alt="Thumbnail Preview"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Invalid+URL'; }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Blog Content (Supports HTML Code)
        </label>
        <textarea
          name="content"
          value={formData.content}
          onChange={handleChange}
          rows={15}
          placeholder="<h1>Blog Title</h1> <p>Start writing your HTML here...</p>"
          className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs font-normal text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors leading-relaxed"
        />
      </div>

      {/* Publish Toggle */}
      <label htmlFor="is_published" className="inline-flex items-center gap-3 cursor-pointer select-none">
        <div className="relative">
          <input
            id="is_published"
            type="checkbox"
            checked={formData.is_published}
            onChange={handleCheckboxChange}
            name="is_published"
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </div>
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          Publish post (visible to public)
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
        <Button href="/admin/blogs" variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  );
}
