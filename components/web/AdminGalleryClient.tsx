"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import {
  UploadCloud,
  Link2,
  Image as ImageIcon,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Calendar,
  Sparkles,
} from "lucide-react";
import { uploadImage, deleteImage, addImageUrl } from "@/app/actions/web/gallery";

type GalleryImage = {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function AdminGalleryClient({
  images: initialImages,
}: {
  images: GalleryImage[];
}) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [uploadType, setUploadType] = useState<"file" | "url">("file");
  const [titleInput, setTitleInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP, etc.).");
      return;
    }
    setError("");
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    setPreview(value.trim() ? value.trim() : null);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!titleInput.trim()) {
      setError("Please enter a title for the image.");
      return;
    }

    if (uploadType === "file" && !selectedFile) {
      setError("Please choose an image file to upload.");
      return;
    }

    if (uploadType === "url" && !urlInput.trim()) {
      setError("Please provide a valid image URL.");
      return;
    }

    const formData = new FormData();
    formData.append("title", titleInput.trim());
    if (selectedFile) {
      formData.append("file", selectedFile);
    }

    startTransition(async () => {
      let result;
      if (uploadType === "file") {
        result = await uploadImage(formData);
      } else {
        result = await addImageUrl(titleInput.trim(), urlInput.trim());
      }

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess("Photo added to gallery successfully!");
        setTitleInput("");
        setUrlInput("");
        clearSelectedFile();
        window.location.reload();
      }
    });
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteImage(id, imageUrl);
      if (result?.error) {
        setError(result.error);
      } else {
        setImages((prev) => prev.filter((img) => img.id !== id));
        setSuccess("Photo deleted successfully.");
      }
      setDeletingId(null);
    });
  };

  const filteredImages = images.filter((img) =>
    img.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-10">
      {/* Upload Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Card Header & Tab Switcher */}
        <div className="p-6 pb-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
              Upload New Photo
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Add institute moments, awards, classrooms, or event photos.
            </p>
          </div>

          {/* Minimal Segmented Toggle */}
          <div className="inline-flex p-1 bg-slate-100/90 dark:bg-slate-800 rounded-lg text-xs font-medium self-start sm:self-auto border border-slate-200/50 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => {
                setUploadType("file");
                setError("");
                setPreview(selectedFile ? URL.createObjectURL(selectedFile) : null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                uploadType === "file"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <UploadCloud size={13} />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadType("url");
                setError("");
                setPreview(urlInput.trim() || null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                uploadType === "url"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Link2 size={13} />
              Image URL
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-5 p-3.5 bg-red-50/80 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/50 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-400 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="flex-1 font-medium">{error}</div>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-5 p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl flex items-start gap-3 text-emerald-700 dark:text-emerald-400 text-xs">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1 font-medium">{success}</div>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleUpload} className="p-6 space-y-5">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Image Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              name="title"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="e.g., Annual Award Ceremony 2024"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Media Input Component */}
          {uploadType === "file" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Image File <span className="text-red-500">*</span>
              </label>

              {/* Hidden native input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!selectedFile ? (
                /* Sleek Dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/80"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mx-auto mb-3 flex items-center justify-center">
                    <UploadCloud size={18} />
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span className="text-blue-600 dark:text-blue-400 hover:underline">
                      Click to upload
                    </span>{" "}
                    or drag & drop
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    PNG, JPG, WebP, GIF up to 10MB
                  </p>
                </div>
              ) : (
                /* Selected File Card */
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {preview ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 relative">
                        <img
                          src={preview}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon size={18} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs sm:max-w-md">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition-colors"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors"
                      title="Remove file"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Image Web URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Link2
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  required
                  type="url"
                  name="url"
                  value={urlInput}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono text-xs"
                />
              </div>

              {preview && (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 relative">
                      <img
                        src={preview}
                        alt="URL Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/100x100?text=Invalid";
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        Valid URL
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                        {urlInput}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUrlInput("");
                      setPreview(null);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-end gap-3">
            {(titleInput || selectedFile || urlInput) && (
              <button
                type="button"
                onClick={() => {
                  setTitleInput("");
                  setUrlInput("");
                  clearSelectedFile();
                }}
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
              >
                Clear
              </button>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>
                    {uploadType === "file" ? "Upload to Gallery" : "Add Photo"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Gallery Library Section */}
      <div className="space-y-4">
        {/* Section Header with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              Gallery Photos
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              {filteredImages.length}
            </span>
          </div>

          {images.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search photos..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Gallery Grid */}
        {filteredImages.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 mx-auto mb-3 flex items-center justify-center">
              <ImageIcon size={20} />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {searchQuery ? "No matching photos found" : "No photos in gallery yet"}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "Try searching with a different keyword."
                : "Upload your first photo above to display it on the public gallery."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map((img) => (
              <div
                key={img.id}
                className="group relative bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all flex flex-col"
              >
                {/* Photo Container */}
                <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <Image
                    src={img.image_url}
                    alt={img.title}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />

                  {/* Quick Delete Floating Action */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDelete(img.id, img.image_url)}
                      disabled={isPending || deletingId === img.id}
                      title="Delete photo"
                      className="p-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 shadow-sm border border-slate-200/50 dark:border-slate-700 transition-colors backdrop-blur-xs disabled:opacity-50"
                    >
                      {deletingId === img.id ? (
                        <Loader2 size={13} className="animate-spin text-red-500" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Meta Info */}
                <div className="p-3">
                  <p
                    className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
                    title={img.title}
                  >
                    {img.title}
                  </p>
                  {img.created_at && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      <Calendar size={11} />
                      <span>{formatDate(img.created_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
