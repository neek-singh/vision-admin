import { getImages } from "@/app/actions/gallery";
import AdminGalleryClient from "./AdminGalleryClient";
import { Button } from "@/components/ui/Button";

export const revalidate = 0;

export default async function AdminGalleryPage() {
  const images = await getImages();

  return (
    <div className="container mx-auto px-6 lg:px-8 py-12 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-blue-950">Gallery Manager</h1>
          <p className="text-gray-500 mt-1">Upload and manage your institute photos.</p>
        </div>
        <Button href="/gallery" variant="outline" className="rounded-full">
          View Public Gallery →
        </Button>
      </div>
      <AdminGalleryClient images={images} />
    </div>
  );
}
