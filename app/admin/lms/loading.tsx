import { Boneyard } from "@/components/ui/Boneyard";

export default function LMSLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Boneyard className="h-8 w-64 mb-1" />
          <Boneyard className="h-4 w-80" />
        </div>
        <Boneyard className="h-10 w-48 rounded-lg" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Boneyard className="h-28 rounded-xl" count={4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Student Activity Skeleton */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <Boneyard className="h-6 w-48" />
              <Boneyard className="h-8 w-48 rounded-lg" />
            </div>
            <div className="p-6 space-y-4">
              <Boneyard className="h-12 w-full" count={5} />
            </div>
          </div>
        </div>

        {/* Quick LMS Controls Skeleton */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <Boneyard className="h-6 w-32" />
            <div className="grid grid-cols-1 gap-2">
              <Boneyard className="h-12 rounded-lg" count={5} />
            </div>
          </div>

          <Boneyard className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
