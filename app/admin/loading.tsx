import { Boneyard } from "@/components/ui/Boneyard";

export default function AdminLoading() {
  return (
    <div className="space-y-12">
      {/* Header Skeleton */}
      <div>
        <Boneyard className="h-10 w-64 mb-2" />
        <Boneyard className="h-4 w-96" />
      </div>

      {/* Vision Learn Section Skeleton */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
          <Boneyard className="h-6 w-48" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Boneyard className="h-32 rounded-2xl" count={4} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Boneyard className="h-12 rounded-xl" count={4} />
        </div>

        <div className="bg-white p-6 rounded-2xl shadow border space-y-4">
          <Boneyard className="h-6 w-48 mb-4" />
          <div className="space-y-3">
            <Boneyard className="h-5 w-full" count={5} />
          </div>
        </div>
      </section>

      {/* Vision Web Section Skeleton */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
          <Boneyard className="h-6 w-48" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Boneyard className="h-32 rounded-2xl" count={4} />
        </div>
      </section>
    </div>
  );
}
