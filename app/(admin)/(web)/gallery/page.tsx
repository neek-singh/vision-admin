import { getImages } from "@/app/actions/web/gallery";
import AdminGalleryClient from "@/components/web/AdminGalleryClient";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const unstable_instant = false;

export default async function AdminGalleryPage() {
  const images = await getImages();

  return (
    <div className="container mx-auto px-6 lg:px-8 py-10 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Gallery Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload and manage photos displayed in the institute public gallery.
          </p>
        </div>

        <Link
          href="/gallery"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors w-fit"
        >
          <span>View Public Gallery</span>
          <ExternalLink size={13} className="text-slate-400" />
        </Link>
      </div>

      <AdminGalleryClient images={images || []} />
    </div>
  );
}
