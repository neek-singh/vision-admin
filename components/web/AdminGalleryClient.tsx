"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { uploadImage, deleteImage, addImageUrl } from "@/app/actions/web/gallery";

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
  const [uploadType, setUploadType] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      let result;
      if (uploadType === "file") {
        result = await uploadImage(formData);
      } else {
        result = await addImageUrl(titleInput, urlInput);
      }

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess("Image added successfully!");
        (e.target as HTMLFormElement).reset();
        setPreview(null);
        setUrlInput("");
        setTitleInput("");
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

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
            <button 
              type="button" 
              onClick={() => setUploadType("file")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${uploadType === 'file' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Upload File
            </button>
            <button 
              type="button" 
              onClick={() => setUploadType("url")}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${uploadType === 'url' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Use Image URL
            </button>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-2 text-sm uppercase tracking-widest">Image Title *</label>
            <input
              required name="title"
              value={titleInput || ""}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-black"
              placeholder="e.g. Annual Award Ceremony 2024"
            />
          </div>

          {uploadType === "file" ? (
            <div key="file-upload-field">
              <label className="block font-semibold text-gray-700 mb-2 text-sm uppercase tracking-widest">Select Image File *</label>
              <input
                key="file-input"
                required={uploadType === "file"} name="file" type="file" accept="image/*"
                onChange={handleFileChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          ) : (
            <div key="url-upload-field">
              <label className="block font-semibold text-gray-700 mb-2 text-sm uppercase tracking-widest">Image URL *</label>
              <input
                key="url-input"
                required={uploadType === "url"} name="url" type="url"
                value={urlInput || ""}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setPreview(e.target.value);
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-mono text-sm"
                placeholder="https://images.unsplash.com/photo-..."
              />
            </div>
          )}

          {preview && (
            <div className="space-y-2">
              <label className="block font-semibold text-gray-400 text-[10px] uppercase tracking-widest">Image Preview</label>
              <div className="relative w-full max-w-sm aspect-video rounded-2xl overflow-hidden border border-gray-100 shadow-xl bg-slate-50">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-full object-contain" 
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Invalid+Image+URL'; }}
                />
              </div>
            </div>
          )}

          <button
            type="submit" disabled={isPending}
            className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-lg"
          >
            {isPending ? "Processing…" : uploadType === 'file' ? "Upload to Gallery" : "Add to Gallery"}
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
