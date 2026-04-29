"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { uploadImage, deleteImage } from "@/app/actions/gallery";

type GalleryImage = {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
};

export default function AdminGalleryClient({ images: initialImages }: { images: GalleryImage[] }) {
  const [images, setImages] = useState(initialImages);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const formData = new FormData(e.currentTarget);
    const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;

    startTransition(async () => {
      const result = await uploadImage(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess("Image uploaded successfully!");
        (e.target as HTMLFormElement).reset();
        setPreview(null);
        // Refresh via server action side effect (revalidatePath)
        window.location.reload();
      }
    });
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!confirm("Delete this image permanently?")) return;
    startTransition(async () => {
      const result = await deleteImage(id, imageUrl);
      if (result?.error) {
        setError(result.error);
      } else {
        setImages((prev) => prev.filter((img) => img.id !== id));
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
    else setPreview(null);
  };

  return (
    <div className="space-y-10">
      {/* Upload Form */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-blue-950 mb-6">Upload New Image</h2>
        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 font-medium">{error}</div>}
        {success && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 font-medium">{success}</div>}

        <form onSubmit={handleUpload} className="space-y-5">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Image Title *</label>
            <input
              required name="title"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
              placeholder="e.g. Annual Award Ceremony 2024"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Image File *</label>
            <input
              required name="file" type="file" accept="image/*"
              onChange={handleFileChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
          {preview && (
            <div className="relative w-40 h-32 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
              <Image src={preview} alt="Preview" fill className="object-cover" />
            </div>
          )}
          <button
            type="submit" disabled={isPending}
            className="px-8 py-3 bg-blue-600 text-white rounded-full font-semibold shadow-md hover:bg-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "Uploading…" : "Upload Image"}
          </button>
        </form>
      </div>

      {/* Image Grid */}
      <div>
        <h2 className="text-xl font-bold text-blue-950 mb-6">All Gallery Images ({images.length})</h2>
        {images.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 text-gray-500">
            No images uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((img) => (
              <div key={img.id} className="group relative rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100 aspect-square">
                <Image
                  src={img.image_url} alt={img.title} fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-white font-semibold text-sm mb-2 line-clamp-2">{img.title}</p>
                  <button
                    onClick={() => handleDelete(img.id, img.image_url)}
                    disabled={isPending}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold w-fit transition-colors"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
