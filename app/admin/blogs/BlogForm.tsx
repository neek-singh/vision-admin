"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { saveBlog } from "@/app/actions/blogs";

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
      className="bg-white p-8 rounded-3xl shadow border max-w-4xl mx-auto space-y-6"
    >
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Blog Title</label>
        <input
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter blog title"
          className="w-full p-4 border border-slate-200 rounded-xl font-black text-black text-lg placeholder:text-slate-400"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">URL Slug</label>
        <div className="flex gap-2">
          <input
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            placeholder="url-slug-here"
            className="w-full p-3 border border-slate-200 rounded-xl font-black text-black placeholder:text-slate-400"
          />
          <Button type="button" onClick={generateSlug} className="font-bold">
            Generate
          </Button>
        </div>
      </div>

      {/* Featured Image */}
      <div>
        <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Featured Image URL</label>
        <div className="space-y-3">
          <input
            name="image_url"
            value={formData.image_url || ""}
            onChange={handleChange}
            placeholder="https://..."
            className="w-full p-3 border border-slate-200 rounded-xl font-mono text-black text-sm"
          />
          {formData.image_url && (
            <div className="relative w-40 h-24 rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
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
        <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-2">
          Blog Content (Supports HTML Code)
        </label>
        <textarea
          name="content"
          value={formData.content}
          onChange={handleChange}
          rows={15}
          placeholder="<h1>Blog Title</h1> <p>Start writing your HTML here...</p>"
          className="w-full p-4 border border-slate-200 rounded-xl font-mono text-sm font-black text-black placeholder:text-slate-400"
        />
      </div>

      {/* Publish */}
      <label className="flex gap-2 text-black">
        <input
          type="checkbox"
          checked={formData.is_published}
          onChange={handleCheckboxChange}
          name="is_published"
        />
        Publish
      </label>

      {/* Actions */}
      <div className="flex gap-4">
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