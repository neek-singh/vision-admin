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
  is_published: boolean;
};

export default function BlogForm({ initialData }: { initialData?: BlogData }) {
  const router = useRouter();

  const [formData, setFormData] = useState<BlogData>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    excerpt: initialData?.excerpt || "",
    content: initialData?.content || "",
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
      <input
        name="title"
        value={formData.title}
        onChange={handleChange}
        placeholder="Title"
        className="w-full p-3 border rounded-xl"
      />

      {/* Slug */}
      <div className="flex gap-2">
        <input
          name="slug"
          value={formData.slug}
          onChange={handleChange}
          placeholder="slug"
          className="w-full p-3 border rounded-xl"
        />
        <Button type="button" onClick={generateSlug}>
          Generate
        </Button>
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Blog Content (Supports HTML Code)
        </label>
        <textarea
          name="content"
          value={formData.content}
          onChange={handleChange}
          rows={15}
          placeholder="<h1>Blog Title</h1> <p>Start writing your HTML here...</p>"
          className="w-full p-3 border rounded-xl font-mono text-sm"
        />
      </div>

      {/* Publish */}
      <label className="flex gap-2">
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